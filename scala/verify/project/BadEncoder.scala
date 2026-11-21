import org.apache.spark.sql.SparkSession

class Plain(val id: String)

object BadEncoder {
  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder().master("local[1]").getOrCreate()
    import spark.implicits._
    val ds = Seq(new Plain("a")).toDS()
    println(ds.count())
  }
}
