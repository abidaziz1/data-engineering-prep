view: orders {
  sql_table_name: analytics.fact_orders ;;

  dimension: order_id {
    primary_key: yes
    type: number
    sql: ${TABLE}.order_id ;;
  }

  dimension: store_id {
    hidden: yes
    type: string
    sql: ${TABLE}.store_id ;;
  }

  dimension: customer_id {
    hidden: yes
    type: number
    sql: ${TABLE}.customer_id ;;
  }

  dimension: status {
    type: string
    sql: ${TABLE}.status ;;
  }

  dimension: shipping_fee {
    hidden: yes
    type: number
    sql: ${TABLE}.shipping_fee ;;
  }

  dimension_group: ordered {
    type: time
    datatype: date
    timeframes: [date, month, quarter, year]
    sql: ${TABLE}.order_date ;;
  }

  measure: order_count {
    type: count
  }

  measure: shipping_total {
    type: sum
    sql: ${shipping_fee} ;;
    value_format_name: usd
  }

  measure: customers {
    type: count_distinct
    sql: ${customer_id} ;;
  }
}
