import { View, Text, Button } from "react-native";

export default function GroupsScreen({ navigation }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Groups Screen</Text>
      <Button title="Go to Group" onPress={() => navigation.navigate("Group Detail")} />
    </View>
  );
}
