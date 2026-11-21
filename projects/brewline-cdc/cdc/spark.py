"""One Spark session with Delta Lake, the Kafka source and the Postgres driver."""

from delta import configure_spark_with_delta_pip
from pyspark.sql import SparkSession

from . import config

DELTA_CATALOG = 'org.apache.spark.sql.delta.catalog.DeltaCatalog'


def session(name='brewline-cdc', packages=True):
    builder = (
        SparkSession.builder.master('local[2]')
        .appName(name)
        .config('spark.sql.extensions', 'io.delta.sql.DeltaSparkSessionExtension')
        .config('spark.sql.catalog.spark_catalog', DELTA_CATALOG)
        .config('spark.sql.shuffle.partitions', '4')
        .config('spark.ui.enabled', 'false')
        .config('spark.ui.showConsoleProgress', 'false')
        .config('spark.sql.session.timeZone', 'UTC')
    )
    extra = config.PACKAGES if packages else []
    spark = configure_spark_with_delta_pip(builder, extra_packages=extra).getOrCreate()
    spark.sparkContext.setLogLevel('ERROR')
    return spark
