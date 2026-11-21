sealed trait Status
case object Placed extends Status
case object Shipped extends Status
case object Refunded extends Status

case class Order(id: String, storeId: Int, status: Status, cents: Long) {
  require(cents >= 0, s"cents must not be negative: $cents")
}

object Orders {
  def label(status: Status): String = status match {
    case Placed   => "on its way"
    case Shipped  => "delivered"
    case Refunded => "money back"
  }

  def main(args: Array[String]): Unit = {
    val a = Order("O-1", 1, Placed, 1250)
    val b = a.copy(status = Shipped)
    println(a)
    println(a == Order("O-1", 1, Placed, 1250))
    println(a eq Order("O-1", 1, Placed, 1250))
    println(b)
    println(label(b.status))
    val Order(id, store, _, cents) = a
    println(s"$id in store $store: $cents cents")
    try Order("O-2", 1, Placed, -5)
    catch { case e: IllegalArgumentException => println(s"bad order: ${e.getMessage}") }
    val orders = List(a, b.copy(id = "O-2", storeId = 2), Order("O-3", 1, Refunded, 900))
    println(orders.groupBy(_.storeId).view.mapValues(_.size).toMap)
    val text = """line 1
                 |line 2""".stripMargin
    println(s"${text.split("\n").length} lines in the text block")
  }
}
