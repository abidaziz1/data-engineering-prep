object Hello {
  def main(args: Array[String]): Unit = {
    val who = if (args.isEmpty) "Brewline" else args(0)
    println(s"Hello, $who from Scala ${scala.util.Properties.versionNumberString} on Java ${Runtime.version().feature()}")
  }
}
