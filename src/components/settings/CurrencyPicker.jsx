import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CURRENCIES, useCurrency } from '../../context/CurrencyContext';
import { useAppMode } from '../../context/AppModeContext';

export default function CurrencyPicker({ visible, onClose }) {
  const { theme } = useAppMode();
  const styles = getStyles(theme);
  const { selectedCode, setCurrency, formatPrice } = useCurrency();

  const handleSelect = (code) => {
    setCurrency(code);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Currency</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <MaterialCommunityIcons name="close" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Prices are stored in ZMW and converted for display only.
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {CURRENCIES.map((currency) => {
            const isSelected = currency.code === selectedCode;
            return (
              <TouchableOpacity
                key={currency.code}
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => handleSelect(currency.code)}
                activeOpacity={0.7}
              >
                <Text style={styles.flag}>{currency.flag}</Text>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowName, isSelected && styles.rowNameSelected]}>
                    {currency.name}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {currency.code} · {currency.symbol} · {formatPrice(1000)}
                  </Text>
                </View>
                {isSelected && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color={theme.colors.primary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const getStyles = (theme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '75%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  list: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 2,
    gap: 12,
  },
  rowSelected: {
    backgroundColor: theme.colors.primaryTint,
  },
  flag: {
    fontSize: 24,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  rowNameSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  rowMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
