/*
  Warnings:

  - You are about to drop the column `chainFilmId` on the `Showtime` table. All the data in the column will be lost.
  - You are about to drop the column `chainSpecific` on the `Showtime` table. All the data in the column will be lost.
  - Added the required column `theatreFilmId` to the `Showtime` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Showtime" DROP COLUMN "chainFilmId",
DROP COLUMN "chainSpecific",
ADD COLUMN     "details" JSONB,
ADD COLUMN     "theatreFilmId" TEXT NOT NULL;
