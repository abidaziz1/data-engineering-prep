window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "build.binary": {
   "all_compiles_clean": true,
   "both212_output": "Map(s1 -> 8, s2 -> 7)",
   "both213_output": "HashMap(s2 -> 7, s1 -> 8)",
   "mixed_compiled": true,
   "mixed_error": "java.lang.NoSuchMethodError: 'scala.collection.immutable.Map Totals$.byStore(scala.collection.immutable.Seq)'",
   "mixed_exit": 1
  },
  "build.compile_error": {
   "class_file_made": false,
   "exit_code": 1,
   "says_type_mismatch": true
  },
  "build.hello": {
   "compile_exit": 0,
   "output": "Hello, Brewline from Scala 2.13.16 on Java 21",
   "prints_scala_version": true,
   "run_exit": 0
  },
  "build.jar": {
   "jar_exit": 0,
   "jar_run_error": "java.lang.NoClassDefFoundError: scala/collection/ArrayOps$",
   "jar_run_exit": 1,
   "with_library_exit": 0,
   "with_library_output": "Hello, Brewline from Scala 2.13.16 on Java 21"
  },
  "build.no_library": {
   "error": "java.lang.NoClassDefFoundError: scala/collection/ArrayOps$",
   "exit": 1
  },
  "challenge": {
   "bad_output": "Left(List(line 8: bad store id: 'x', line 9: more than two decimals: '12.505'))",
   "expected": "Right(TreeMap(1 -> 599, 2 -> 2285, 3 -> 10000))",
   "good_output": "Right(TreeMap(1 -> 599, 2 -> 2285, 3 -> 10000))"
  },
  "coll": {
   "duplicate_key_line": "Map(MUG -> 1, BEANS-250 -> 5, FILTER -> 5)",
   "head_line": "head: head of empty list",
   "lazy_steps": 4,
   "lazy_trace": "map 1, filter 10, map 2, filter 20",
   "missing_key_line": "stock(\"TEA\"): key not found: TEA",
   "strict_steps": 8,
   "total_cents": 15250
  },
  "err": {
   "bad": 3,
   "cents": 1950,
   "good": 2,
   "lines": 12,
   "none_get": "None.get",
   "number_format": "java.lang.NumberFormatException: For input string: \"12x\"",
   "summary": "2 good, 3 bad, 1950 cents"
  },
  "lang": {
   "exit": 1,
   "match_error": "Refunded (of class Refunded$)",
   "missing_input": "Refunded",
   "orders_lines": 9,
   "warning": true
  },
  "spark": {
   "banner": "Spark 4.0.1 on Scala 2.13.16",
   "by_store": "(1,83), (2,84), (3,84)",
   "cause": "java.io.NotSerializableException: Settings",
   "closure_headline": "Task not serializable",
   "exit": 0,
   "fixed_count": 901,
   "orders": 1000,
   "placed": 900,
   "untyped_error": "UNRESOLVED_COLUMN.WITH_SUGGESTION"
  },
  "spark.errors": {
   "encoder_exit": 1,
   "encoder_message": "value toDS is not a member of Seq[Plain]",
   "typed_exit": 1,
   "typed_hint": true,
   "typed_message": "value statu is not a member of Order"
  }
 },
 "files": {
  "BadEncoder.scala": "import org.apache.spark.sql.SparkSession\n\nclass Plain(val id: String)\n\nobject BadEncoder {\n  def main(args: Array[String]): Unit = {\n    val spark = SparkSession.builder().master(\"local[1]\").getOrCreate()\n    import spark.implicits._\n    val ds = Seq(new Plain(\"a\")).toDS()\n    println(ds.count())\n  }\n}\n",
  "BadTyped.scala": "import org.apache.spark.sql.Dataset\n\nobject BadTyped {\n  def placed(orders: Dataset[Order]): Long = orders.filter(_.statu == \"PLACED\").count()\n}\n",
  "BadTypes.scala": "object BadTypes {\n  def main(args: Array[String]): Unit = {\n    val quantity: Int = \"12\"\n    println(quantity)\n  }\n}\n",
  "Challenge.scala": "import scala.collection.immutable.SortedMap\n\nobject Challenge {\n  def parseCents(amount: String): Either[String, Long] =\n    scala.util.Try(BigDecimal(amount)).toOption.toRight(s\"not a number: '$amount'\").flatMap { d =>\n      if (d.scale > 2) Left(s\"more than two decimals: '$amount'\") else Right((d * 100).toLongExact)\n    }\n\n  def parse(line: String): Either[String, (Int, Long)] = line.split(\",\", -1) match {\n    case Array(_, store, _, amount) =>\n      for {\n        storeId <- store.toIntOption.toRight(s\"bad store id: '$store'\")\n        cents   <- parseCents(amount)\n      } yield (storeId, cents)\n    case fields => Left(s\"expected 4 fields but got ${fields.length}\")\n  }\n\n  def centsByStore(lines: Iterator[String]): Either[List[String], SortedMap[Int, Long]] = {\n    val (errors, totals) = lines.drop(1).zipWithIndex.foldLeft((List.empty[String], SortedMap.empty[Int, Long])) {\n      case ((errs, sums), (line, i)) =>\n        parse(line) match {\n          case Right((store, cents)) => (errs, sums.updated(store, sums.getOrElse(store, 0L) + cents))\n          case Left(error)           => (s\"line ${i + 2}: $error\" :: errs, sums)\n        }\n    }\n    if (errors.isEmpty) Right(totals) else Left(errors.reverse)\n  }\n\n  def main(args: Array[String]): Unit = {\n    val header = \"order_id,store_id,status,amount\"\n    val good = List(header, \"O-1,2,PLACED,12.50\", \"O-2,1,PLACED,5.00\", \"O-3,2,REFUNDED,3.25\", \"O-4,1,PLACED,0.99\", \"O-5,3,PLACED,100\", \"O-6,2,PLACED,7.10\")\n    println(centsByStore(good.iterator))\n    println(centsByStore((good ++ List(\"O-7,x,PLACED,1.00\", \"O-8,1,PLACED,12.505\")).iterator))\n  }\n}\n",
  "Collections.scala": "import scala.collection.mutable.ListBuffer\n\nobject Collections {\n  case class Line(sku: String, qty: Int, cents: Long)\n\n  def main(args: Array[String]): Unit = {\n    val lines = List(Line(\"MUG\", 1, 900), Line(\"BEANS-250\", 2, 1800), Line(\"BEANS-250\", 5, 1800), Line(\"FILTER\", 5, 350))\n    println(lines.map(_.sku))\n    println(lines.groupMapReduce(_.sku)(_.qty)(_ + _))\n    println(lines.foldLeft(0L)((total, l) => total + l.qty * l.cents))\n    println(lines.map(l => l.sku -> l.qty).toMap)\n    val stock = Map(\"MUG\" -> 1)\n    println(stock.get(\"TEA\"))\n    println(stock.getOrElse(\"TEA\", 0))\n    try stock(\"TEA\") catch { case e: NoSuchElementException => println(s\"stock(\\\"TEA\\\"): ${e.getMessage}\") }\n    println(List.empty[Int].headOption)\n    try List.empty[Int].head catch { case e: NoSuchElementException => println(s\"head: ${e.getMessage}\") }\n    val xs = List(1, 2, 3, 4)\n    println((xs :+ 5, xs))\n    val seen = ListBuffer.empty[String]\n    val firstStrict = xs.map { x => seen += s\"map $x\"; x * 10 }.filter { x => seen += s\"filter $x\"; x % 20 == 0 }.head\n    println(s\"strict: $firstStrict after ${seen.size} steps\")\n    seen.clear()\n    val firstLazy = xs.view.map { x => seen += s\"map $x\"; x * 10 }.filter { x => seen += s\"filter $x\"; x % 20 == 0 }.head\n    println(s\"view: $firstLazy after ${seen.size} steps: ${seen.mkString(\", \")}\")\n    println(for { l <- lines; if l.qty > 1 } yield l.sku)\n  }\n}\n",
  "Errors.scala": "import scala.util.Try\n\nobject Errors {\n  case class Order(id: String, storeId: Int, cents: Long)\n\n  def parseCents(amount: String): Either[String, Long] =\n    Try(BigDecimal(amount)).toOption.toRight(s\"not a number: '$amount'\").flatMap { d =>\n      if (d.scale > 2) Left(s\"more than two decimals: '$amount'\") else Right((d * 100).toLongExact)\n    }\n\n  def parse(line: String): Either[String, Order] = line.split(\",\", -1) match {\n    case Array(id, store, amount) =>\n      for {\n        storeId <- store.toIntOption.toRight(s\"bad store id: '$store'\")\n        cents   <- parseCents(amount)\n      } yield Order(id, storeId, cents)\n    case fields => Left(s\"expected 3 fields but got ${fields.length}: '$line'\")\n  }\n\n  def main(args: Array[String]): Unit = {\n    val lines = List(\"O-1,1,12.50\", \"O-2,x,3.00\", \"O-3,2,4.505\", \"O-4,2\", \"O-5,2,7\")\n    val results = lines.map(parse)\n    results.foreach(println)\n    val (errors, orders) = results.partitionMap(identity)\n    println(s\"${orders.size} good, ${errors.size} bad, ${orders.map(_.cents).sum} cents\")\n    println(Try(Option.empty[Int].get).failed.get.getMessage)\n    println(Try(\"12x\".toInt).failed.get)\n    println(Option(\"a\").orElse(Some(\"b\")))\n    println(for { a <- Some(2); b <- Option.empty[Int] } yield a + b)\n    println(Try(\"42\".toInt).map(_ + 1).getOrElse(-1))\n    val strict: Either[String, List[Order]] = lines.map(parse).partitionMap(identity) match {\n      case (Nil, ok) => Right(ok)\n      case (bad, _)  => Left(bad.head)\n    }\n    println(strict)\n  }\n}\n",
  "Hello.scala": "object Hello {\n  def main(args: Array[String]): Unit = {\n    val who = if (args.isEmpty) \"Brewline\" else args(0)\n    println(s\"Hello, $who from Scala ${scala.util.Properties.versionNumberString} on Java ${Runtime.version().feature()}\")\n  }\n}\n",
  "Orders.scala": "sealed trait Status\ncase object Placed extends Status\ncase object Shipped extends Status\ncase object Refunded extends Status\n\ncase class Order(id: String, storeId: Int, status: Status, cents: Long) {\n  require(cents >= 0, s\"cents must not be negative: $cents\")\n}\n\nobject Orders {\n  def label(status: Status): String = status match {\n    case Placed   => \"on its way\"\n    case Shipped  => \"delivered\"\n    case Refunded => \"money back\"\n  }\n\n  def main(args: Array[String]): Unit = {\n    val a = Order(\"O-1\", 1, Placed, 1250)\n    val b = a.copy(status = Shipped)\n    println(a)\n    println(a == Order(\"O-1\", 1, Placed, 1250))\n    println(a eq Order(\"O-1\", 1, Placed, 1250))\n    println(b)\n    println(label(b.status))\n    val Order(id, store, _, cents) = a\n    println(s\"$id in store $store: $cents cents\")\n    try Order(\"O-2\", 1, Placed, -5)\n    catch { case e: IllegalArgumentException => println(s\"bad order: ${e.getMessage}\") }\n    val orders = List(a, b.copy(id = \"O-2\", storeId = 2), Order(\"O-3\", 1, Refunded, 900))\n    println(orders.groupBy(_.storeId).view.mapValues(_.size).toMap)\n    val text = \"\"\"line 1\n                 |line 2\"\"\".stripMargin\n    println(s\"${text.split(\"\\n\").length} lines in the text block\")\n  }\n}\n",
  "Partial.scala": "object Partial {\n  def fee(status: Status): Int = status match {\n    case Placed  => 0\n    case Shipped => 5\n  }\n\n  def main(args: Array[String]): Unit = {\n    println(fee(Placed))\n    println(fee(Refunded))\n  }\n}\n",
  "SparkApp.scala": "import org.apache.spark.sql.{AnalysisException, Dataset, SparkSession}\nimport org.apache.spark.sql.functions.col\n\ncase class Order(orderId: String, storeId: Int, status: String, cents: Long)\n\nclass Settings(val minCents: Long)\n\nobject SparkApp {\n  def firstLine(e: Throwable): String = e.getMessage.split(\"\\n\").head\n  def rootCause(e: Throwable): Throwable = if (e.getCause == null) e else rootCause(e.getCause)\n\n  def main(args: Array[String]): Unit = {\n    val spark = SparkSession.builder().master(\"local[2]\").appName(\"brewline\")\n      .config(\"spark.ui.enabled\", \"false\").config(\"spark.sql.shuffle.partitions\", \"2\").getOrCreate()\n    spark.sparkContext.setLogLevel(\"ERROR\")\n    import spark.implicits._\n    println(s\"Spark ${spark.version} on Scala ${scala.util.Properties.versionNumberString}\")\n\n    val orders: Dataset[Order] = spark.range(1, 1001).map { i =>\n      Order(s\"O-$i\", (1 + i % 12).toInt, if (i % 10 == 0) \"REFUNDED\" else \"PLACED\", 500 + i)\n    }\n    println(s\"orders: ${orders.count()}\")\n    println(s\"placed: ${orders.filter(_.status == \"PLACED\").count()}\")\n    println(orders.groupByKey(_.storeId).count().collect().sortBy(_._1).take(3).mkString(\", \"))\n    println(orders.filter(o => o.cents > 1400).map(_.orderId).collect().sorted.take(2).mkString(\", \"))\n\n    try orders.filter(col(\"statu\") === \"PLACED\").count()\n    catch { case e: AnalysisException => println(\"untyped column typo: \" + e.getCondition) }\n\n    val settings = new Settings(600)\n    try orders.filter(o => o.cents >= settings.minCents).count()\n    catch {\n      case e: Exception =>\n        println(\"closure over Settings: \" + firstLine(e))\n        println(\"cause: \" + rootCause(e).toString.split(\"\\n\").head)\n    }\n\n    val minCents = settings.minCents\n    println(\"copy the number first: \" + orders.filter(o => o.cents >= minCents).count())\n    spark.stop()\n  }\n}\n",
  "Totals.scala": "object Totals {\n  def byStore(sales: Seq[(String, Int)]): Map[String, Int] =\n    sales.groupBy(_._1).map { case (store, rows) => store -> rows.map(_._2).sum }\n}\n",
  "UseTotals.scala": "object UseTotals {\n  def main(args: Array[String]): Unit = {\n    val sales = Seq((\"s1\", 5), (\"s2\", 7), (\"s1\", 3))\n    println(Totals.byStore(sales))\n  }\n}\n"
 },
 "meta": {
  "java_feature": 21,
  "java_version": "21.0.12.1",
  "note": "Recorded by scala/verify/capture_scala.py on the real Scala 2.13 compiler, the JDK and Spark of one machine. sbt, Scala 3 and a cluster were not used.",
  "recorded_on": "2026-11-21",
  "scala": "2.13.16",
  "scala_212": "2.12.20",
  "spark": "4.0.1",
  "vm": "OpenJDK 64-Bit Server VM"
 },
 "tables": {},
 "text": {
  "build.binary": "# Totals.scala and UseTotals.scala, both compiled and run with Scala 2.13.16\nscalac Totals.scala UseTotals.scala\njava -cp app:lib:scala-library-2.13.16.jar UseTotals\nHashMap(s2 -> 7, s1 -> 8)\n\n# the same two files, both compiled and run with Scala 2.12.20\nscalac Totals.scala UseTotals.scala\njava -cp app:lib:scala-library-2.12.20.jar UseTotals\nMap(s1 -> 8, s2 -> 7)\n\n# Totals compiled with 2.12.20, UseTotals compiled with 2.13.16 against it, run on the 2.13.16 library\nscalac -cp lib212 UseTotals.scala\njava -cp app:lib212:scala-library-2.13.16.jar UseTotals\nException in thread \"main\" java.lang.NoSuchMethodError: 'scala.collection.immutable.Map Totals$.byStore(scala.collection.immutable.Seq)'\n\tat UseTotals$.main(UseTotals.scala:4)\n\tat UseTotals.main(UseTotals.scala)",
  "build.compile_error": "scalac BadTypes.scala\n~/src/BadTypes.scala:3: error: type mismatch;\n found   : String(\"12\")\n required: Int\n    val quantity: Int = \"12\"\n                        ^\n1 error",
  "build.hello": "scalac Hello.scala\njava -cp out:scala-library.jar Hello\nHello, Brewline from Scala 2.13.16 on Java 21",
  "build.jar": "jar --create --file hello.jar --main-class Hello -C out .\njava -jar hello.jar\nException in thread \"main\" java.lang.NoClassDefFoundError: scala/collection/ArrayOps$\n\tat Hello$.main(Hello.scala:3)\n\njava -cp hello.jar:scala-library.jar Hello\nHello, Brewline from Scala 2.13.16 on Java 21",
  "build.no_library": "java -cp out Hello\nException in thread \"main\" java.lang.NoClassDefFoundError: scala/collection/ArrayOps$\n\tat Hello$.main(Hello.scala:3)\n\tat Hello.main(Hello.scala)",
  "challenge.run": "scalac Challenge.scala\njava -cp out:scala-library.jar Challenge\nRight(TreeMap(1 -> 599, 2 -> 2285, 3 -> 10000))\nLeft(List(line 8: bad store id: 'x', line 9: more than two decimals: '12.505'))",
  "coll.collections": "scalac Collections.scala\njava -cp out:scala-library.jar Collections\nList(MUG, BEANS-250, BEANS-250, FILTER)\nMap(FILTER -> 5, BEANS-250 -> 7, MUG -> 1)\n15250\nMap(MUG -> 1, BEANS-250 -> 5, FILTER -> 5)\nNone\n0\nstock(\"TEA\"): key not found: TEA\nNone\nhead: head of empty list\n(List(1, 2, 3, 4, 5),List(1, 2, 3, 4))\nstrict: 20 after 8 steps\nview: 20 after 4 steps: map 1, filter 10, map 2, filter 20\nList(BEANS-250, BEANS-250, FILTER)",
  "err.errors": "scalac Errors.scala\njava -cp out:scala-library.jar Errors\nRight(Order(O-1,1,1250))\nLeft(bad store id: 'x')\nLeft(more than two decimals: '4.505')\nLeft(expected 3 fields but got 2: 'O-4,2')\nRight(Order(O-5,2,700))\n2 good, 3 bad, 1950 cents\nNone.get\njava.lang.NumberFormatException: For input string: \"12x\"\nSome(a)\nNone\n43\nLeft(bad store id: 'x')",
  "lang.orders": "scalac Orders.scala\njava -cp out:scala-library.jar Orders\nOrder(O-1,1,Placed,1250)\ntrue\nfalse\nOrder(O-1,1,Shipped,1250)\ndelivered\nO-1 in store 1: 1250 cents\nbad order: requirement failed: cents must not be negative: -5\nMap(1 -> 2, 2 -> 1)\n2 lines in the text block",
  "lang.partial": "scalac Orders.scala Partial.scala\n~/src/Partial.scala:2: warning: match may not be exhaustive.\nIt would fail on the following input: Refunded\n  def fee(status: Status): Int = status match {\n                                 ^\n1 warning\n\njava -cp out:scala-library.jar Partial\n0\nException in thread \"main\" scala.MatchError: Refunded (of class Refunded$)\n\tat Partial$.fee(Partial.scala:2)",
  "spark.encoder_error": "scalac BadEncoder.scala\n~/src/BadEncoder.scala:9: error: value toDS is not a member of Seq[Plain]\n    val ds = Seq(new Plain(\"a\")).toDS()\n                                 ^\n1 error",
  "spark.run": "spark-submit --master local[2] --class SparkApp app.jar\nSpark 4.0.1 on Scala 2.13.16\norders: 1000\nplaced: 900\n(1,83), (2,84), (3,84)\nO-1000, O-901\nuntyped column typo: UNRESOLVED_COLUMN.WITH_SUGGESTION\nclosure over Settings: Task not serializable\ncause: java.io.NotSerializableException: Settings\ncopy the number first: 901",
  "spark.typed_error": "scalac BadTyped.scala\n~/src/BadTyped.scala:4: error: value statu is not a member of Order\ndid you mean status?\n  def placed(orders: Dataset[Order]): Long = orders.filter(_.statu == \"PLACED\").count()\n                                                             ^\n1 error",
  "tool.versions": "scalac -version\nScala compiler version 2.13.16 -- Copyright 2002-2025, LAMP/EPFL and Lightbend, Inc. dba Akka\n\njava -version\nopenjdk version \"21.0.12.1\" 2026-08-18\nOpenJDK Runtime Environment (build 21.0.12.1+1-1-24.04.4-Ubuntu)\nOpenJDK 64-Bit Server VM (build 21.0.12.1+1-1-24.04.4-Ubuntu, mixed mode, sharing)\n\nspark-submit --version (the Spark of the course)\nSpark 4.0.1, built with Scala 2.13.16"
 }
};
