import scala.collection.mutable.ListBuffer

object Collections {
  case class Line(sku: String, qty: Int, cents: Long)

  def main(args: Array[String]): Unit = {
    val lines = List(Line("MUG", 1, 900), Line("BEANS-250", 2, 1800), Line("BEANS-250", 5, 1800), Line("FILTER", 5, 350))
    println(lines.map(_.sku))
    println(lines.groupMapReduce(_.sku)(_.qty)(_ + _))
    println(lines.foldLeft(0L)((total, l) => total + l.qty * l.cents))
    println(lines.map(l => l.sku -> l.qty).toMap)
    val stock = Map("MUG" -> 1)
    println(stock.get("TEA"))
    println(stock.getOrElse("TEA", 0))
    try stock("TEA") catch { case e: NoSuchElementException => println(s"stock(\"TEA\"): ${e.getMessage}") }
    println(List.empty[Int].headOption)
    try List.empty[Int].head catch { case e: NoSuchElementException => println(s"head: ${e.getMessage}") }
    val xs = List(1, 2, 3, 4)
    println((xs :+ 5, xs))
    val seen = ListBuffer.empty[String]
    val firstStrict = xs.map { x => seen += s"map $x"; x * 10 }.filter { x => seen += s"filter $x"; x % 20 == 0 }.head
    println(s"strict: $firstStrict after ${seen.size} steps")
    seen.clear()
    val firstLazy = xs.view.map { x => seen += s"map $x"; x * 10 }.filter { x => seen += s"filter $x"; x % 20 == 0 }.head
    println(s"view: $firstLazy after ${seen.size} steps: ${seen.mkString(", ")}")
    println(for { l <- lines; if l.qty > 1 } yield l.sku)
  }
}
