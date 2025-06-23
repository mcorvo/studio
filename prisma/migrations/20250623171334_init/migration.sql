-- CreateTable
CREATE TABLE "License" (
    "id" SERIAL NOT NULL,
    "Produttore" TEXT NOT NULL,
    "Prodotto" TEXT NOT NULL,
    "Tipo_Licenza" TEXT NOT NULL,
    "Numero_Licenze" INTEGER NOT NULL,
    "Bundle" INTEGER NOT NULL,
    "Borrowable" BOOLEAN NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);
