view: order_lines {
  sql_table_name: analytics.fact_order_lines ;;

  dimension: line_key {
    primary_key: yes
    hidden: yes
    type: string
    sql: ${TABLE}.order_id || '-' || ${TABLE}.line_no ;;
  }

  dimension: order_id {
    hidden: yes
    type: number
    sql: ${TABLE}.order_id ;;
  }

  dimension: product_id {
    hidden: yes
    type: number
    sql: ${TABLE}.product_id ;;
  }

  dimension: quantity {
    type: number
    sql: ${TABLE}.quantity ;;
  }

  dimension: line_amount {
    hidden: yes
    type: number
    sql: ${TABLE}.line_amount ;;
  }

  measure: revenue {
    type: sum
    sql: ${line_amount} ;;
    value_format_name: usd
    description: "Sum of the line amounts. Shipping is not part of it."
  }

  measure: units {
    type: sum
    sql: ${quantity} ;;
  }
}
