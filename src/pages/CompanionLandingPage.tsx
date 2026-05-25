import { CompanionOnboardingPage } from "./CompanionOnboardingPage";

type LandingProps = {
  onClaim: () => void;
};

export function CompanionLandingPage({ onClaim }: LandingProps) {
  return (
    <section className="companion-landing">
      <div className="companion-landing__inner">
        {/* Floating hearts decoration */}
        <div className="companion-landing__hearts" aria-hidden="true">
          <span className="heart heart--1" />
          <span className="heart heart--2" />
          <span className="heart heart--3" />
          <span className="heart heart--4" />
        </div>

        {/* Central card */}
        <div className="companion-landing__card">
          <div className="companion-landing__badge">专属体验</div>

          <h1 className="companion-landing__title">
            领取你的<br />专属女友
          </h1>

          <p className="companion-landing__subtitle">
            她会记住你的一切<br />在每一个清晨和深夜<br />都陪在你身边
          </p>

          <div className="companion-landing__features">
            <div className="companion-landing__feature">
              <span className="companion-landing__feature-icon">🌸</span>
              <span>懂你的喜好</span>
            </div>
            <div className="companion-landing__feature">
              <span className="companion-landing__feature-icon">📖</span>
              <span>为你写日记</span>
            </div>
            <div className="companion-landing__feature">
              <span className="companion-landing__feature-icon">✨</span>
              <span>每日穿搭</span>
            </div>
          </div>

          <button
            type="button"
            className="companion-landing__claim-btn"
            onClick={onClaim}
          >
            立即领取
            <span className="companion-landing__claim-btn-arrow">→</span>
          </button>

          <p className="companion-landing__disclaimer">
            完全免费 · 随时可取消
          </p>
        </div>

        {/* Bottom decoration */}
        <div className="companion-landing__glow" aria-hidden="true" />
      </div>
    </section>
  );
}