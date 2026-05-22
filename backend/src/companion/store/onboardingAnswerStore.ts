import Database from "better-sqlite3";

export type OnboardingAnswerInput = {
  questionKey: string;
  answerValue: string;
  answerWeight?: number;
};

export function createOnboardingAnswerStore(db: Database.Database) {
  const insertStmt = db.prepare(`
    INSERT INTO onboarding_answers (
      id, user_id, question_key, answer_value, answer_weight, answered_at
    ) VALUES (
      @id, @userId, @questionKey, @answerValue, @answerWeight, @answeredAt
    )
  `);

  const listStmt = db.prepare(`
    SELECT
      id,
      user_id as userId,
      question_key as questionKey,
      answer_value as answerValue,
      answer_weight as answerWeight,
      answered_at as answeredAt
    FROM onboarding_answers
    WHERE user_id = ?
    ORDER BY answered_at ASC
  `);

  return {
    insertMany(userId: string, answers: OnboardingAnswerInput[], nowIso: string, answerPrefix = "") {
      const tx = db.transaction(() => {
        for (const [index, answer] of answers.entries()) {
          insertStmt.run({
            id: `oa_${userId}_${answerPrefix}_${index}_${Date.parse(nowIso)}`,
            userId,
            questionKey: answer.questionKey,
            answerValue: answer.answerValue,
            answerWeight: answer.answerWeight ?? 1,
            answeredAt: nowIso,
          });
        }
      });
      tx();
    },
    listByUserId(userId: string) {
      return listStmt.all(userId) as Array<{
        questionKey: string;
        answerValue: string;
        answerWeight: number;
      }>;
    },
  };
}