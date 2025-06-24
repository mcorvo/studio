/*
  Warnings:

  - Added the required column `Contratto` to the `License` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Rivenditore` to the `License` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Scadenza` to the `License` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "License" ADD COLUMN     "Contratto" TEXT NOT NULL,
ADD COLUMN     "Rivenditore" TEXT NOT NULL,
ADD COLUMN     "Scadenza" TIMESTAMP(3) NOT NULL;
