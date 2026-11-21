package demo;

import java.io.Reader;
import java.io.StringReader;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

public class Main {
    public static void main(String[] args) throws Exception {
        CSVFormat format = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).build();
        try (Reader in = new StringReader("order_id,amount\nO-1,5.00\n"); CSVParser parser = format.parse(in)) {
            for (CSVRecord row : parser) {
                System.out.println(row.get("order_id") + " " + row.get("amount"));
            }
        }
    }
}
