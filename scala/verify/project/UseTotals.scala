object UseTotals {
  def main(args: Array[String]): Unit = {
    val sales = Seq(("s1", 5), ("s2", 7), ("s1", 3))
    println(Totals.byStore(sales))
  }
}
