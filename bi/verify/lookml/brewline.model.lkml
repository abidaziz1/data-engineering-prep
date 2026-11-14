connection: "brewline_warehouse"

include: "/views/*.view.lkml"

datagroup: nightly_load {
  sql_trigger: SELECT max(loaded_at) FROM analytics.load_log ;;
  max_cache_age: "24 hours"
}

explore: order_lines {
  label: "Sales"
  persist_with: nightly_load

  join: orders {
    type: left_outer
    relationship: many_to_one
    sql_on: ${order_lines.order_id} = ${orders.order_id} ;;
  }

  join: stores {
    type: left_outer
    relationship: many_to_one
    sql_on: ${orders.store_id} = ${stores.store_id} ;;
  }

  join: products {
    type: left_outer
    relationship: many_to_one
    sql_on: ${order_lines.product_id} = ${products.product_id} ;;
  }

  access_filter: {
    field: stores.region
    user_attribute: region
  }
}
