import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AuthProvider } from './lib/auth';
import { FavoritesProvider } from './lib/favorites';
import { colors } from './lib/theme';
import { SearchScreen } from './screens/SearchScreen';
import { DetailScreen } from './screens/DetailScreen';
import { FavoritesScreen } from './screens/FavoritesScreen';
import { PublishScreen } from './screens/PublishScreen';
import { AccountScreen } from './screens/AccountScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function tabIcon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Buscar"
        component={SearchScreen}
        options={{ tabBarIcon: tabIcon('🔍') }}
      />
      <Tab.Screen
        name="Favoritos"
        component={FavoritesScreen}
        options={{ tabBarIcon: tabIcon('♥') }}
      />
      <Tab.Screen
        name="Publicar"
        component={PublishScreen}
        options={{ tabBarIcon: tabIcon('➕') }}
      />
      <Tab.Screen
        name="Cuenta"
        component={AccountScreen}
        options={{ tabBarIcon: tabIcon('👤') }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FavoritesProvider>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen
                name="Tabs"
                component={Tabs}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Detail"
                component={DetailScreen}
                options={{
                  title: 'Inmueble',
                  headerTintColor: colors.primaryDark,
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <StatusBar style="light" />
        </FavoritesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
