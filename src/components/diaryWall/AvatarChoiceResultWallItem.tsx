import type { HomeAvatarResultRecord } from "../../types/avatarChoiceLoop";

export function AvatarChoiceResultWallItem({ result }: { result: HomeAvatarResultRecord }) {
  return (
    <article className="card avatar-choice-result-wall-item">
      <p className="section-label">她后来真的这样做了</p>
      <h3>{result.title}</h3>
      <p>{result.body}</p>
      {result.imageUrl ? (
        <img src={result.imageUrl} alt={result.title} className="ootd-image" />
      ) : null}
    </article>
  );
}