-- CreateTable
CREATE TABLE "occupancy_by_location" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "location_name" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "bookings" INTEGER NOT NULL,
    "booked_hours" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "occupancy_by_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_by_plan" (
    "id" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "transactions" INTEGER NOT NULL,

    CONSTRAINT "revenue_by_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_retention" (
    "id" TEXT NOT NULL,
    "cohort" TEXT NOT NULL,
    "started" INTEGER NOT NULL,
    "active" INTEGER NOT NULL,
    "churned" INTEGER NOT NULL,
    "retention_rate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "member_retention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etl_runs" (
    "id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "details" JSONB,
    "error" TEXT,

    CONSTRAINT "etl_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "occupancy_by_location_location_id_day_key" ON "occupancy_by_location"("location_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_by_plan_plan_name_month_currency_key" ON "revenue_by_plan"("plan_name", "month", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "member_retention_cohort_key" ON "member_retention"("cohort");

-- CreateIndex
CREATE INDEX "etl_runs_started_at_idx" ON "etl_runs"("started_at");
