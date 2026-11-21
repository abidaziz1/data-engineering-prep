import org.apache.spark.sql.{AnalysisException, Dataset, SparkSession}
import org.apache.spark.sql.functions.col

case class Order(orderId: String, storeId: Int, status: String, cents: Long)

class Settings(val minCents: Long)

object SparkApp {
  def firstLine(e: Throwable): String = e.getMessage.split("\n").head
  def rootCause(e: Throwable): Throwable = if (e.getCause == null) e else rootCause(e.getCause)

  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder().master("local[2]").appName("brewline")
      .config("spark.ui.enabled", "false").config("spark.sql.shuffle.partitions", "2").getOrCreate()
    spark.sparkContext.setLogLevel("ERROR")
    import spark.implicits._
    println(s"Spark ${spark.version} on Scala ${scala.util.Properties.versionNumberString}")

    val orders: Dataset[Order] = spark.range(1, 1001).map { i =>
      Order(s"O-$i", (1 + i % 12).toInt, if (i % 10 == 0) "REFUNDED" else "PLACED", 500 + i)
    }
    println(s"orders: ${orders.count()}")
    println(s"placed: ${orders.filter(_.status == "PLACED").count()}")
    println(orders.groupByKey(_.storeId).count().collect().sortBy(_._1).take(3).mkString(", "))
    println(orders.filter(o => o.cents > 1400).map(_.orderId).collect().sorted.take(2).mkString(", "))

    try orders.filter(col("statu") === "PLACED").count()
    catch { case e: AnalysisException => println("untyped column typo: " + e.getCondition) }

    val settings = new Settings(600)
    try orders.filter(o => o.cents >= settings.minCents).count()
    catch {
      case e: Exception =>
        println("closure over Settings: " + firstLine(e))
        println("cause: " + rootCause(e).toString.split("\n").head)
    }

    val minCents = settings.minCents
    println("copy the number first: " + orders.filter(o => o.cents >= minCents).count())
    spark.stop()
  }
}
