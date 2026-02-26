import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
    const parsed = {
      type: type || null,
      price_min: priceMin ? Number(priceMin) : null,
      price_max: priceMax ? Number(priceMax) : null,
      active: !!onlyActive,
    };
    onApply(parsed);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>Filters</Text>

          <Text style={styles.label}>Listing Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'stay' && styles.typeBtnActive]}
              onPress={() => setType('stay')}
            >
              <Text style={[styles.typeText, type === 'stay' && styles.typeTextActive]}>Stay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'event' && styles.typeBtnActive]}
              onPress={() => setType('event')}
            >
              <Text style={[styles.typeText, type === 'event' && styles.typeTextActive]}>Event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'offering' && styles.typeBtnActive]}
              onPress={() => setType('offering')}
            >
              <Text style={[styles.typeText, type === 'offering' && styles.typeTextActive]}>Offering</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Price range</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="Min"
              keyboardType="numeric"
              value={priceMin.toString()}
              onChangeText={setPriceMin}
            />
            <TextInput
              style={styles.input}
              placeholder="Max"
              keyboardType="numeric"
              value={priceMax.toString()}
              onChangeText={setPriceMax}
            />
          </View>

          <View style={styles.rowSpace}>
            <Text style={styles.label}>Only active listings</Text>
            <Switch value={onlyActive} onValueChange={setOnlyActive} />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.clearBtn} onPress={() => { setType(null); setPriceMin(''); setPriceMax(''); setOnlyActive(true); }}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={apply}>
              <Text style={styles.applyText}>Apply</Text>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  rowSpace: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  typeBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F5F5F5' },
  typeBtnActive: { backgroundColor: '#4A90E2' },
  typeText: { color: '#333' },
  typeTextActive: { color: '#fff', fontWeight: '700' },
  input: { flex: 1, height: 40, borderRadius: 8, backgroundColor: '#F5F5F5', paddingHorizontal: 8 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  clearBtn: { padding: 10 },
  clearText: { color: '#666' },
  applyBtn: { backgroundColor: '#4A90E2', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  applyText: { color: '#fff', fontWeight: '700' },
  close: { alignSelf: 'center', marginTop: 12 },
  closeText: { color: '#4A90E2' },
});