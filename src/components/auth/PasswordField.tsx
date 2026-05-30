import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type PasswordFieldProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  onToggleVisibility: () => void;
  iconColor?: string;
  inputStyle?: StyleProp<TextStyle>;
  visible: boolean;
};

export default function PasswordField({
  containerStyle,
  label,
  labelStyle,
  iconColor = '#526172',
  inputStyle,
  onToggleVisibility,
  visible,
  ...props
}: PasswordFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      <View style={[styles.inputRow, containerStyle]}>
        <TextInput
          {...props}
          secureTextEntry={!visible}
          style={[styles.input, inputStyle]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={10}
          onPress={onToggleVisibility}
          style={styles.iconButton}>
          <Ionicons color={iconColor} name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: '#132238',
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    alignItems: 'center',
    backgroundColor: '#edf3ef',
    borderColor: '#d6e2db',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    paddingRight: 6,
  },
  input: {
    color: '#132238',
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 40,
  },
});
