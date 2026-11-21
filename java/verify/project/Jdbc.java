import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class Jdbc {
    static long count(Connection c, String sql) throws SQLException {
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) {
            rs.next();
            return rs.getLong(1);
        }
    }

    public static void main(String[] args) throws Exception {
        try (Connection c = DriverManager.getConnection("jdbc:h2:mem:brewline")) {
            try (Statement s = c.createStatement()) {
                s.execute("CREATE TABLE orders (order_id VARCHAR(20) PRIMARY KEY, store_id INT, status VARCHAR(10), amount DECIMAL(10, 2))");
            }
            int batches = 0;
            try (PreparedStatement ps = c.prepareStatement("INSERT INTO orders VALUES (?, ?, ?, ?)")) {
                for (int i = 1; i <= 1000; i++) {
                    ps.setString(1, "O-" + i);
                    ps.setInt(2, 1 + i % 12);
                    ps.setString(3, i % 10 == 0 ? "REFUNDED" : "PLACED");
                    ps.setBigDecimal(4, new java.math.BigDecimal(5 + i % 80));
                    ps.addBatch();
                    if (i % 250 == 0) {
                        ps.executeBatch();
                        batches++;
                    }
                }
            }
            System.out.println("rows after " + batches + " batches: " + count(c, "SELECT count(*) FROM orders"));

            String typed = "x' OR '1'='1";
            long glued = count(c, "SELECT count(*) FROM orders WHERE status = '" + typed + "'");
            long bound;
            try (PreparedStatement ps = c.prepareStatement("SELECT count(*) FROM orders WHERE status = ?")) {
                ps.setString(1, typed);
                try (ResultSet rs = ps.executeQuery()) {
                    rs.next();
                    bound = rs.getLong(1);
                }
            }
            System.out.println("glued into the text: " + glued + " rows, bound as a parameter: " + bound + " rows");

            c.setAutoCommit(false);
            try (Statement s = c.createStatement()) {
                s.execute("DELETE FROM orders WHERE store_id = 1");
            }
            System.out.println("inside the transaction: " + count(c, "SELECT count(*) FROM orders"));
            c.rollback();
            System.out.println("after the rollback: " + count(c, "SELECT count(*) FROM orders"));

            try (Statement s = c.createStatement()) {
                s.execute("INSERT INTO orders VALUES ('O-1', 1, 'PLACED', 1.00)");
            } catch (SQLException e) {
                System.out.println("duplicate key: SQLState " + e.getSQLState());
            }
        }
    }
}
