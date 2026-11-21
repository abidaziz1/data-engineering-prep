package brewline;

import java.io.Reader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;

public class Loader {
    /** "12.50" becomes 1250. A value with more than two decimals is refused, not rounded. */
    public static long parseCents(String amount) {
        return new BigDecimal(amount).movePointRight(2).setScale(0, RoundingMode.UNNECESSARY).longValueExact();
    }

    public static void main(String[] args) throws Exception {
        CSVFormat format = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).build();
        try (Reader in = Files.newBufferedReader(Path.of(args[0]));
             Connection db = DriverManager.getConnection("jdbc:h2:mem:loader")) {
            db.createStatement().execute("CREATE TABLE orders (order_id VARCHAR(20) PRIMARY KEY, store_id INT, amount_cents BIGINT)");
            try (PreparedStatement insert = db.prepareStatement("INSERT INTO orders VALUES (?, ?, ?)")) {
                for (CSVRecord row : format.parse(in)) {
                    insert.setString(1, row.get("order_id"));
                    insert.setInt(2, Integer.parseInt(row.get("store_id")));
                    insert.setLong(3, parseCents(row.get("amount")));
                    insert.addBatch();
                }
                insert.executeBatch();
            }
            try (ResultSet rs = db.createStatement().executeQuery("SELECT count(*), sum(amount_cents) FROM orders")) {
                rs.next();
                System.out.println(rs.getLong(1) + " orders, " + rs.getLong(2) + " cents");
            }
        }
    }
}
