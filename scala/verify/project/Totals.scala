object Totals {
  def byStore(sales: Seq[(String, Int)]): Map[String, Int] =
    sales.groupBy(_._1).map { case (store, rows) => store -> rows.map(_._2).sum }
}
