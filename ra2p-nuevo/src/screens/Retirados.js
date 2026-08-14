import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Retirados = ({ navigation }) => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
      <View style={{ padding: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#6C5CE7" />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 10 }}>✅ Retirados</Text>
        <Text style={{ marginTop: 20, color: '#666' }}>Pantalla en construccion...</Text>
      </View>
    </SafeAreaView>
  );
};

export default Retirados;