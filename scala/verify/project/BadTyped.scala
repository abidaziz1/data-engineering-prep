import org.apache.spark.sql.Dataset

object BadTyped {
  def placed(orders: Dataset[Order]): Long = orders.filter(_.statu == "PLACED").count()
}
