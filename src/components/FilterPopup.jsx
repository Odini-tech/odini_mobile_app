import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import burgundyTheme from '../theme/burgundyTheme';

const t = burgundyTheme.colors;

export default function FilterPopup({ visible, onClose, onApply, initialFilters = {} }) {
  const [type, setType] = useState(initialFilters.type || null);
  const [priceMin, setPriceMin] = useState(initialFilters.price_min || '');
  const [priceMax, setPriceMax] = useState(initialFilters.price_max || '');
  const [onlyActive, setOnlyActive] = useState(initialFilters.active ?? true);

  useEffect(() => {
    setType(initialFilters.type || null);
    setPriceMin(initialFilters.price_min ?? '');
    setPriceMax(initialFilters.price_max ?? '');
    setOnlyActive(initialFilters.active ?? true);
  }, [initialFilters, visible]);

  function apply() {
    onApply({
      type: type || null,
      price_min: priceMin ? Number(priceMin) : null,
      price_max: priceMax ? Number(priceMax) : null,
      active: !!onlyActive,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>Filters</Text>

          <Text style={styles.label}>Listing Type</Text>
          <View style={styles.typeRow}>
            {['stay', 'event', 'offering'].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.typeBtn, type === opt && styles.typeBtnActive]}
                onPress={() => setType(type === opt ? null : opt)}
              >
                <Text style={[styles.typeText, type === opt && styles.typeTextActive]}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Price range (ZMW)</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="Min"
              placeholderTextColor={t.textSubtle}
              keyboardType="numeric"
              value={priceMin.toString()}
              onChangeText={setPriceMin}
            />
            <TextInput
              style={styles.input}
              placeholder="Max"
              placeholderTextColor={t.textSubtle}
              keyboardType="numeric"
              value={priceMax.toString()}
              onChangeText={setPriceMax}
            />
          </View>

          <View style={styles.rowSpace}>
            <Text style={styles.label}>Only active listings</Text>
            <Switch
              value={onlyActive}
              onValueChange={setOnlyActive}
              trackColor={{ false: t.border, true: t.primarySoft }}
              thumbColor={t.white}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => { setType(null); setPriceMin(''); setPriceMax(''); setOnlyActive(true); }}
            >
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={apply}>
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: t.surface,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: t.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: t.textMuted,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  rowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  typeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: t.surfaceAlt,
    borderWidth: 1.5,
    borderColor: t.border,
  },
  typeBtnActive: {
    backgroundColor: t.primaryTint,
    borderColor: t.primary,
  },
  typeText: {
    color: t.textMuted,
    fontWeight: '500',
    fontSize: 14,
  },
  typeTextActive: {
    color: t.primary,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: t.surfaceAlt,
    paddingHorizontal: 12,
    color: t.text,
    borderWidth: 1,
    borderColor: t.border,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  clearBtn: {
    padding: 10,
  },
  clearText: {
    color: t.textMuted,
    fontSize: 15,
  },
  applyBtn: {
    backgroundColor: t.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  applyText: {
    color: t.white,
    fontWeight: '700',
    fontSize: 15,
  },
  close: {
    alignSelf: 'center',
    marginTop: 16,
    padding: 6,
  },
  closeText: {
    color: t.primary,
    fontSize: 15,
    fontWeight: '500',
  },
});
