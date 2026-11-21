import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;

public class Times {
    public static void main(String[] args) {
        ZoneId ny = ZoneId.of("America/New_York");
        System.out.println(ZonedDateTime.of(LocalDateTime.of(2026, 3, 8, 2, 30), ny));
        ZonedDateTime overlap = ZonedDateTime.of(LocalDateTime.of(2026, 11, 1, 1, 30), ny);
        System.out.println(overlap + " and " + overlap.withLaterOffsetAtOverlap());
        ZonedDateTime before = ZonedDateTime.of(LocalDateTime.of(2026, 3, 7, 12, 0), ny);
        ZonedDateTime after = before.plusDays(1);
        System.out.println(after + " " + Duration.between(before, after).toHours() + " hours, " + ChronoUnit.DAYS.between(before, after) + " day");
        System.out.println(Instant.parse("2026-03-14T09:12:00Z").atZone(ny).toLocalDateTime());
        DateTimeFormatter f = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        System.out.println(LocalDateTime.parse("2026-03-14 09:12:00", f));
        try {
            LocalDate.parse("2026-02-30");
        } catch (DateTimeParseException e) {
            System.out.println(e.getMessage());
        }
        try {
            LocalDateTime.parse("14/03/2026 09:12", f);
        } catch (DateTimeParseException e) {
            System.out.println(e.getMessage());
        }
    }
}
