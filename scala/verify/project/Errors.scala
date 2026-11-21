import scala.util.Try

object Errors {
  case class Order(id: String, storeId: Int, cents: Long)

  def parseCents(amount: String): Either[String, Long] =
    Try(BigDecimal(amount)).toOption.toRight(s"not a number: '$amount'").flatMap { d =>
      if (d.scale > 2) Left(s"more than two decimals: '$amount'") else Right((d * 100).toLongExact)
    }

  def parse(line: String): Either[String, Order] = line.split(",", -1) match {
    case Array(id, store, amount) =>
      for {
        storeId <- store.toIntOption.toRight(s"bad store id: '$store'")
        cents   <- parseCents(amount)
      } yield Order(id, storeId, cents)
    case fields => Left(s"expected 3 fields but got ${fields.length}: '$line'")
  }

  def main(args: Array[String]): Unit = {
    val lines = List("O-1,1,12.50", "O-2,x,3.00", "O-3,2,4.505", "O-4,2", "O-5,2,7")
    val results = lines.map(parse)
    results.foreach(println)
    val (errors, orders) = results.partitionMap(identity)
    println(s"${orders.size} good, ${errors.size} bad, ${orders.map(_.cents).sum} cents")
    println(Try(Option.empty[Int].get).failed.get.getMessage)
    println(Try("12x".toInt).failed.get)
    println(Option("a").orElse(Some("b")))
    println(for { a <- Some(2); b <- Option.empty[Int] } yield a + b)
    println(Try("42".toInt).map(_ + 1).getOrElse(-1))
    val strict: Either[String, List[Order]] = lines.map(parse).partitionMap(identity) match {
      case (Nil, ok) => Right(ok)
      case (bad, _)  => Left(bad.head)
    }
    println(strict)
  }
}
