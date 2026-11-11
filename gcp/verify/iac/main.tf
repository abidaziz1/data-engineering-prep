# Brewline data platform, first version. It works, and it has the gaps that a review catches.
variable "project" {
  type    = string
  default = "brewline-dev"
}

resource "google_storage_bucket" "landing" {
  name     = "brewline-landing-dev"
  location = "asia-southeast1"
}

resource "google_bigquery_dataset" "raw" {
  dataset_id = "raw"
  location   = "asia-southeast1"

  access {
    role          = "READER"
    special_group = "allAuthenticatedUsers"
  }
}

resource "google_bigquery_table" "orders" {
  dataset_id = google_bigquery_dataset.raw.dataset_id
  table_id   = "orders"

  time_partitioning {
    type  = "DAY"
    field = "order_ts"
  }
  clustering = ["store_id"]
}

resource "google_service_account" "pipeline" {
  account_id = "sa-pipeline"
}

resource "google_project_iam_member" "pipeline_role" {
  project = var.project
  role    = "roles/owner"
  member  = "serviceAccount:${google_service_account.pipeline.email}"
}

resource "google_pubsub_topic" "orders" {
  name = "pos-orders"
}
