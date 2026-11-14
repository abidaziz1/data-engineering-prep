view: orders_broken {
  sql_table_name: analytics.fact_orders ;;

  dimension: order_id {
    primary_key: yes
    type: number
    sql: ${TABLE}.order_id ;;

  measure: order_count {
    type: count
  }
}
