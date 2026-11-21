import scala.collection.immutable.SortedMap

object Challenge {
  def parseCents(amount: String): Either[String, Long] =
    scala.util.Try(BigDecimal(amount)).toOption.toRight(s"not a number: '$amount'").flatMap { d =>
      if (d.scale > 2) Left(s"more than two decimals: '$amount'") else Right((d * 100).toLongExact)
    }

  def parse(line: String): Either[String, (Int, Long)] = line.split(",", -1) match {
    case Array(_, store, _, amount) =>
      for {
        storeId <- store.toIntOption.toRight(s"bad store id: '$store'")
        cents   <- parseCents(amount)
      } yield (storeId, cents)
    case fields => Left(s"expected 4 fields but got ${fields.length}")
  }

  def centsByStore(lines: Iterator[String]): Either[List[String], SortedMap[Int, Long]] = {
    val (errors, totals) = lines.drop(1).zipWithIndex.foldLeft((List.empty[String], SortedMap.empty[Int, Long])) {
      case ((errs, sums), (line, i)) =>
        parse(line) match {
          case Right((store, cents)) => (errs, sums.updated(store, sums.getOrElse(store, 0L) + cents))
          case Left(error)           => (s"line ${i + 2}: $error" :: errs, sums)
        }
    }
    if (errors.isEmpty) Right(totals) else Left(errors.reverse)
  }

  def main(args: Array[String]): Unit = {
    val header = "order_id,store_id,status,amount"
    val good = List(header, "O-1,2,PLACED,12.50", "O-2,1,PLACED,5.00", "O-3,2,REFUNDED,3.25", "O-4,1,PLACED,0.99", "O-5,3,PLACED,100", "O-6,2,PLACED,7.10")
    println(centsByStore(good.iterator))
    println(centsByStore((good ++ List("O-7,x,PLACED,1.00", "O-8,1,PLACED,12.505")).iterator))
  }
}
