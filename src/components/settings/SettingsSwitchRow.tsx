import { Switch, StyleSheet, Text, View } from 'react-native';

type SettingsSwitchRowProps = {
  description?: string;
  disabled?: boolean;
  helper?: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
  title: string;
};

export default function SettingsSwitchRow({
  description,
  disabled = false,
  helper,
  onValueChange,
  value,
  title,
}: SettingsSwitchRowProps) {
  return (
    <View style={[styles.row, disabled ? styles.rowDisabled : null]}>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      </View>
      <Switch
        disabled={disabled}
        onValueChange={onValueChange}
        thumbColor="#ffffff"
        trackColor={{ false: '#d4dbe4', true: '#0f766e' }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    minHeight: 78,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDisabled: {
    opacity: 0.65,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#132238',
    fontSize: 15,
    fontWeight: '700',
  },
  description: {
    color: '#526172',
    fontSize: 13,
    lineHeight: 18,
  },
  helper: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
  },
});
