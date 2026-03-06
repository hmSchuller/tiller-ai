export type TabDefinition = {
  id: string;
  label: string;
};

export type TabBarProps = {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (id: string) => void;
};

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="tab-bar" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTab}
          className={`tab-button${tab.id === activeTab ? ' active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
