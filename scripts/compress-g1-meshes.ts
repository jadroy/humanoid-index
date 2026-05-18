/**
 * Convert the G1 URDF's STL meshes to indexed, Draco-compressed GLBs.
 *
 * Usage:
 *   npx tsx scripts/compress-g1-meshes.ts
 *
 * Reads:  assets/g1-source/meshes/*.STL  (auto-fetched from upstream if missing)
 * Writes: public/3d/g1/meshes-glb/*.glb
 *
 * Upstream meshes live in unitreerobotics/unitree_ros and are gitignored locally
 * because they're ~19MB of STL. Only the ~1.5MB compressed GLBs ship.
 */

import { Document, NodeIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression } from "@gltf-transform/extensions";
import { weld, draco } from "@gltf-transform/functions";
// @ts-expect-error — draco3dgltf ships no types
import draco3d from "draco3dgltf";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import fs from "node:fs/promises";
import path from "node:path";

const MESH_DIR = path.resolve("assets/g1-source/meshes");
const URDF_PATH = path.resolve("public/3d/g1/g1_23dof.urdf");
const OUT_DIR = path.resolve("public/3d/g1/meshes-glb");
const UPSTREAM_BASE =
  "https://raw.githubusercontent.com/unitreerobotics/unitree_ros/master/robots/g1_description/meshes";

async function ensureSourceMeshes(meshNames: string[]) {
  await fs.mkdir(MESH_DIR, { recursive: true });
  const missing: string[] = [];
  for (const name of meshNames) {
    try {
      await fs.access(path.join(MESH_DIR, name));
    } catch {
      missing.push(name);
    }
  }
  if (missing.length === 0) return;
  console.log(`Fetching ${missing.length} source meshes from upstream…`);
  await Promise.all(
    missing.map(async (name) => {
      const res = await fetch(`${UPSTREAM_BASE}/${name}`);
      if (!res.ok) throw new Error(`failed ${name}: ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(path.join(MESH_DIR, name), buf);
    })
  );
  console.log("Done.\n");
}

async function readMeshNamesFromURDF(): Promise<string[]> {
  const urdf = await fs.readFile(URDF_PATH, "utf8");
  const set = new Set<string>();
  for (const match of urdf.matchAll(/meshes\/([\w-]+\.STL)/gi)) {
    set.add(match[1]);
  }
  return [...set];
}

async function makeIO() {
  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({
      "draco3d.decoder": await draco3d.createDecoderModule(),
      "draco3d.encoder": await draco3d.createEncoderModule(),
    });
  return io;
}

async function convertOne(stlPath: string, glbPath: string, io: NodeIO) {
  const buf = await fs.readFile(stlPath);
  // Slice into a fresh ArrayBuffer in case Node returned a view.
  const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const geom = new STLLoader().parse(arrayBuf as ArrayBuffer);

  const positionAttr = geom.getAttribute("position");
  if (!positionAttr) throw new Error(`No position attribute in ${stlPath}`);
  const positions = new Float32Array(positionAttr.array as Float32Array);

  const normalAttr = geom.getAttribute("normal");
  const normals = normalAttr
    ? new Float32Array(normalAttr.array as Float32Array)
    : null;

  const doc = new Document();
  const buffer = doc.createBuffer();

  const positionAccessor = doc
    .createAccessor()
    .setArray(positions)
    .setType("VEC3")
    .setBuffer(buffer);

  const prim = doc.createPrimitive().setAttribute("POSITION", positionAccessor);

  if (normals) {
    const normalAccessor = doc
      .createAccessor()
      .setArray(normals)
      .setType("VEC3")
      .setBuffer(buffer);
    prim.setAttribute("NORMAL", normalAccessor);
  }

  const mesh = doc.createMesh().addPrimitive(prim);
  const node = doc.createNode().setMesh(mesh);
  doc.createScene().addChild(node);

  // Dedupe bitwise-identical vertices (STL has per-triangle duplication), then quantize.
  await doc.transform(weld());
  await doc.transform(
    draco({
      method: "edgebreaker",
      encodeSpeed: 5,
      decodeSpeed: 5,
      quantizePosition: 14,
      quantizeNormal: 10,
      quantizeColor: 8,
      quantizeTexcoord: 12,
      quantizeGeneric: 12,
    })
  );

  await io.write(glbPath, doc);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const files = await readMeshNamesFromURDF();
  await ensureSourceMeshes(files);
  const io = await makeIO();

  let totalIn = 0;
  let totalOut = 0;
  console.log(`Converting ${files.length} meshes…\n`);

  for (const f of files) {
    const inP = path.join(MESH_DIR, f);
    const outName = f.replace(/\.STL$/i, ".glb");
    const outP = path.join(OUT_DIR, outName);
    const inSize = (await fs.stat(inP)).size;
    try {
      await convertOne(inP, outP, io);
      const outSize = (await fs.stat(outP)).size;
      totalIn += inSize;
      totalOut += outSize;
      const ratio = (outSize / inSize) * 100;
      console.log(
        `  ${f.padEnd(38)} ${(inSize / 1024).toFixed(0).padStart(6)} KB → ${(outSize / 1024).toFixed(0).padStart(6)} KB  (${ratio.toFixed(1)}%)`
      );
    } catch (err) {
      console.error(`  ✗ ${f}:`, (err as Error).message);
    }
  }

  console.log(
    `\nTotal: ${(totalIn / 1024 / 1024).toFixed(2)} MB → ${(totalOut / 1024 / 1024).toFixed(2)} MB  (${((totalOut / totalIn) * 100).toFixed(1)}%)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
