{/* Modal de Detalle */}
<Modal
  animationType="slide"
  transparent={true}
  visible={modalVisible}
  onRequestClose={() => setModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <ScrollView style={styles.modalContent}>
      <Text style={styles.modalTitle}>📋 Detalle de Transferencia</Text>

      {transferenciaSeleccionada && (
        <View>
          <Text style={styles.modalLabel}>Código:</Text>
          <Text style={styles.modalValue}>{transferenciaSeleccionada.codigoIdentificador}</Text>

          <Text style={styles.modalLabel}>Nombre:</Text>
          <Text style={styles.modalValue}>{transferenciaSeleccionada.nombreUsuario}</Text>

          <Text style={styles.modalLabel}>Valor:</Text>
          <Text style={styles.modalValue}>{formatValor(transferenciaSeleccionada.valor)}</Text>

          <Text style={styles.modalLabel}>Zona:</Text>
          <Text style={styles.modalValue}>{transferenciaSeleccionada.zonaSector} - {transferenciaSeleccionada.barrio}</Text>

          <Text style={styles.modalLabel}>Banco:</Text>
          <Text style={styles.modalValue}>{transferenciaSeleccionada.bancoCuenta}</Text>

          <Text style={styles.modalLabel}>Fecha:</Text>
          <Text style={styles.modalValue}>{formatFecha(transferenciaSeleccionada.fechaTransferencia)}</Text>

          <Text style={styles.modalLabel}>Responsable:</Text>
          <Text style={styles.modalValue}>{transferenciaSeleccionada.responsable}</Text>

          <Text style={styles.modalLabel}>Estado:</Text>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(transferenciaSeleccionada.estado), alignSelf: 'flex-start' }]}>
            <Text style={styles.estadoBadgeText}>{getEstadoLabel(transferenciaSeleccionada.estado)}</Text>
          </View>

          {/* 👈 IMAGEN DEL COMPROBANTE (CAMBIADO) */}
          {transferenciaSeleccionada.imagenComprobante && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.modalLabel}>📷 Comprobante:</Text>
              <Image
                source={{
                  uri: transferenciaSeleccionada.imagenComprobante.startsWith('data:image')
                    ? transferenciaSeleccionada.imagenComprobante
                    : `data:image/jpeg;base64,${transferenciaSeleccionada.imagenComprobante}`
                }}
                style={styles.modalImagen}
                resizeMode="cover"
              />
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.modalCerrar}
        onPress={() => setModalVisible(false)}
      >
        <Text style={styles.modalCerrarText}>Cerrar</Text>
      </TouchableOpacity>
    </ScrollView>
  </View>
</Modal>