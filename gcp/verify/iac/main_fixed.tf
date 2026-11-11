# Brewline data platform, after the review. The same resources, with the gaps closed.
variable "project" {
  type    = string
  default = "brewline-dev"
}

resource "google_storage_bucket" "landing" {
  name                        = "brewline-landing-dev"
  location                    = "asia-southeast1"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  logging {
    log_bucket = "brewline-logs-dev"
  }
}

resource "google_bigquery_dataset" "raw" {
  dataset_id = "raw"
  location   = "asia-southeast1"

  default_encryption_configuration {
    kms_key_name = "projects/brewline-dev/locations/asia-southeast1/keyRings/data/cryptoKeys/bigquery"
  }
}

resource "google_bigquery_table" "orders" {
  dataset_id          = google_bigquery_dataset.raw.dataset_id
  table_id            = "orders"
  deletion_protection = true

  time_partitioning {
    type  = "DAY"
    field = "order_ts"
  }
  clustering = ["store_id"]

  encryption_configuration {
    kms_key_name = "projects/brewline-dev/locations/asia-southeast1/keyRings/data/cryptoKeys/bigquery"
  }
}

resource "google_service_account" "pipeline" {
  account_id = "sa-pipeline"
}

resource "google_project_iam_member" "pipeline_role" {
  project = var.project
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.pipeline.email}"
}

resource "google_pubsub_topic" "orders" {
  name         = "pos-orders"
  kms_key_name = "projects/brewline-dev/locations/asia-southeast1/keyRings/data/cryptoKeys/pubsub"
}
