-- CreateTable
CREATE TABLE "Cinema" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "searchableName" TEXT NOT NULL,
    "address" TEXT,
    "fullAddress" TEXT,
    "externalIds" JSONB,
    "source" JSONB,

    CONSTRAINT "Cinema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "language" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleVariations" TEXT[],
    "movieIds" TEXT[],
    "tmdbId" INTEGER,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tmdb" (
    "id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "original_title" TEXT,
    "original_language" TEXT,
    "origin_country" TEXT[],
    "image" JSONB,
    "videos" JSONB,
    "release_date" TEXT,
    "parental" TEXT,
    "runtime" INTEGER,
    "spoken_languages" JSONB,
    "genres" JSONB,
    "ratings" JSONB,
    "overview" TEXT,
    "external_ids" JSONB,
    "recommendations" TEXT,
    "streaming" JSONB,

    CONSTRAINT "tmdb_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Updates" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "modelName" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "sourceField" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "destinationField" TEXT,
    "destinationText" TEXT,

    CONSTRAINT "Updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarbageTitle" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "GarbageTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Showtime" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "unixTime" BIGINT NOT NULL,
    "link" TEXT NOT NULL,
    "ticketType" TEXT NOT NULL,
    "movieFormat" TEXT NOT NULL,
    "chainSpecific" JSONB,
    "chainFilmId" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "cinemaId" TEXT NOT NULL,

    CONSTRAINT "Showtime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_titleVariations_key" ON "Movie"("titleVariations");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_movieIds_key" ON "Movie"("movieIds");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "GarbageTitle_title_key" ON "GarbageTitle"("title");

-- AddForeignKey
ALTER TABLE "Movie" ADD CONSTRAINT "Movie_tmdbId_fkey" FOREIGN KEY ("tmdbId") REFERENCES "tmdb"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Showtime" ADD CONSTRAINT "Showtime_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Showtime" ADD CONSTRAINT "Showtime_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
