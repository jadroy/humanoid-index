export default function Sidebar() {
  return (
    <aside className="w-40 h-screen bg-white p-5 flex flex-col fixed left-0 top-0">
      <div className="mb-8">
        <h1 className="text-[12px]" style={{ color: '#625D5D' }}>
          Humanoid
        </h1>
        <h1 className="text-[12px]" style={{ color: 'rgba(98, 93, 93, 0.6)' }}>
          Index
        </h1>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2 text-[12px]" style={{ color: 'rgba(98, 93, 93, 0.6)' }}>
          <li className="cursor-pointer hover:opacity-100 transition-opacity" style={{ color: '#625D5D' }}>All</li>
          <li className="cursor-pointer hover:opacity-100 transition-opacity">Production</li>
          <li className="cursor-pointer hover:opacity-100 transition-opacity">Prototype</li>
          <li className="cursor-pointer hover:opacity-100 transition-opacity">Research</li>
        </ul>
      </nav>

      <div className="text-[12px]" style={{ color: 'rgba(98, 93, 93, 0.6)' }}>
        <p>Roy Jad</p>
      </div>
    </aside>
  );
}
