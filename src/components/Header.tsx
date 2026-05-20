import type { AppPage } from "../types/journal";

const tabs: { id: AppPage; label: string }[] = [
  { id: "home", label: "首页" },
  { id: "write", label: "我来写" },
  { id: "ask-her", label: "请她写" },
  { id: "voice", label: "语音页" },
  { id: "settings", label: "设置" },
];

type HeaderProps = {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
};

export function Header({ activePage, onNavigate }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <p className="eyebrow">✿ Girlfriend Journal ✿</p>
        <h1 className="header-title">女友手账</h1>
        <p className="subtitle">记录每一天的小温柔</p>
      </div>

      <nav className="tab-bar" aria-label="页面导航">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activePage ? "tab is-active" : "tab"}
            onClick={() => onNavigate(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
