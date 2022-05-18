import React, { useState, useEffect } from 'react'
import { TouchableOpacity, View, Button, Modal, Text, StyleSheet, Animated } from 'react-native'

import * as Common from '../../utils/Common';

const modalHeight = parseInt(Common.height/2.8);

export default ImageModal = (props) => {
  const { visible, onRequestClose, importFromCamera, importFromAlbum } = props;

  const [modalYAnim, setmodalYAnim] = useState(new Animated.Value(modalHeight));
  useEffect(() => {
    if (props.visible) {
      showModal()
    }
  }, [props.visible])

  const showModal = () => {
    Animated.timing(modalYAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start();
  };
  const hideModal = () => {
    Animated.timing(modalYAnim, {
      toValue: modalHeight,
      duration: 200,
      useNativeDriver: true
    }).start(() => onRequestClose());
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={() => hideModal()}
      animationType='fade'
      transparent={true}
    >
      <View style={styles.modalBackground} onStartShouldSetResponder={() => hideModal()} />
      <Animated.View style={[styles.modalView, {transform: [{translateY: modalYAnim}]}]}>
        <Text>Hi</Text>
        <Button onPress={() => {importFromCamera();}} title={'사진 촬영'}/>
        <Button onPress={() => {importFromAlbum();}} title={'앨범 선택'}/>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalView: {
    height: modalHeight,
    backgroundColor: '#fff',
    padding: 22,
  },
})