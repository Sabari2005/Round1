-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "awardedScore" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scoredAt" DATETIME,
    "teamId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    CONSTRAINT "Submission_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Submission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Submission" ("answer", "awardedScore", "createdAt", "id", "isCorrect", "questionId", "scoredAt", "teamId") SELECT "answer", "awardedScore", "createdAt", "id", "isCorrect", "questionId", "scoredAt", "teamId" FROM "Submission";
DROP TABLE "Submission";
ALTER TABLE "new_Submission" RENAME TO "Submission";
CREATE INDEX "Submission_questionId_createdAt_idx" ON "Submission"("questionId", "createdAt");
CREATE UNIQUE INDEX "Submission_teamId_questionId_key" ON "Submission"("teamId", "questionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
