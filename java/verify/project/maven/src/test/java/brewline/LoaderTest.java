package brewline;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class LoaderTest {
    @Test
    void parsesAmountsAsCents() {
        assertEquals(1250, Loader.parseCents("12.50"));
        assertEquals(500, Loader.parseCents("5"));
    }

    @Test
    void refusesMoreThanTwoDecimals() {
        assertThrows(ArithmeticException.class, () -> Loader.parseCents("12.505"));
    }
}
