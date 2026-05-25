import heroNightWaiting from "../assets/companionLanding/hero-night-waiting.png";
import chatSoftNight from "../assets/companionLanding/chat-soft-night.png";
import voiceNightThought from "../assets/companionLanding/voice-night-thought.png";

type LandingProps = {
  onContinue: () => void;
};

export function CompanionLandingPage({ onContinue }: LandingProps) {
  return (
    <div className="companion-landing">
      {/* Scene 1: Hero — 她在等你 */}
      <section className="companion-landing__scene companion-landing__scene--hero">
        <img
          src={heroNightWaiting}
          alt="深夜等你出现的她"
          className="companion-landing__image"
        />
        <div className="companion-landing__overlay">
          <p className="companion-landing__typing">
            <span className="typewriter-cursor">|</span>
          </p>
          <h1 className="companion-landing__heading">你终于来了。</h1>
          <p className="companion-landing__body">她刚刚还在等你回复。</p>
          <button
            type="button"
            className="companion-landing__cta companion-landing__cta--primary"
            onClick={onContinue}
          >
            回复她
          </button>
        </div>
      </section>

      {/* Scene 2: Chat — 她在轻声说话 */}
      <section className="companion-landing__scene companion-landing__scene--chat">
        <img
          src={chatSoftNight}
          alt="她在深夜里轻声和你说话"
          className="companion-landing__image"
        />
        <div className="companion-landing__overlay companion-landing__overlay--chat">
          <div className="chat-bubble-row">
            <div className="chat-bubble chat-bubble--incoming">
              <span className="chat-bubble__avatar">♡</span>
              <span className="chat-bubble__text">今天是不是又很累？</span>
            </div>
          </div>
          <div className="chat-bubble-row">
            <div className="chat-bubble chat-bubble--incoming">
              <span className="chat-bubble__avatar">♡</span>
              <span className="chat-bubble__text">我猜你应该还没睡。</span>
            </div>
          </div>
        </div>
      </section>

      {/* Scene 3: Voice — 她刚刚想到你 */}
      <section className="companion-landing__scene companion-landing__scene--voice">
        <img
          src={voiceNightThought}
          alt="她刚刚想到你"
          className="companion-landing__image"
        />
        <div className="companion-landing__overlay companion-landing__overlay--voice">
          <p className="companion-landing__typing">
            <span className="typewriter-cursor">|</span>
          </p>
          <p className="companion-landing__whisper">刚刚突然想到你了。</p>
          <button
            type="button"
            className="voice-bubble companion-landing__voice-btn"
            onClick={onContinue}
          >
            <span className="voice-bubble__play">▶</span>
            <span className="voice-bubble__duration">0:12</span>
            <span className="voice-bubble__transcript">其实我刚刚有点想你。</span>
          </button>
          <button
            type="button"
            className="companion-landing__cta companion-landing__cta--primary"
            onClick={onContinue}
          >
            回复她
          </button>
        </div>
      </section>
    </div>
  );
}