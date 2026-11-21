object Partial {
  def fee(status: Status): Int = status match {
    case Placed  => 0
    case Shipped => 5
  }

  def main(args: Array[String]): Unit = {
    println(fee(Placed))
    println(fee(Refunded))
  }
}
