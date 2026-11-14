view: stores {
  sql_table_name: analytics.dim_store ;;

  dimension: store_id {
    primary_key: yes
    type: string
    sql: ${TABLE}.store_id ;;
  }

  dimension: city {
    type: string
    sql: ${TABLE}.city ;;
  }

  dimension: region {
    type: string
    sql: ${TABLE}.region ;;
  }
}
