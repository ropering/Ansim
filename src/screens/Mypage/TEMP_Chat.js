import React, { useState, useCallback, useEffect, useLayoutEffect } from 'react'
import { TouchableOpacity, View, Button, Modal } from 'react-native'
import { GiftedChat } from 'react-native-gifted-chat'
import firestore from '@react-native-firebase/firestore';
import { Avatar } from 'react-native-elements';
import ShowBottomSheet from './ShowBottomSheet';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker'; // Migration from 2.x.x to 3.x.x => showImagePicker API is removed.
import storage from '@react-native-firebase/storage';
import ImageModal from './ImageModal'
import auth from "@react-native-firebase/auth";


/*
받아야 하는 값
- 게시글 id 필드 값
*/

export default function Chat(props) {
  // let email, nickname, profileImg
  let postId = '11';
  const [url, setUrl] = useState();
  // const {postId} = props;
  const [messages, setMessages] = useState([]);
  const userInfo = {
    _id: auth().currentUser.email, // email
    name: auth().currentUser.displayName, // nickname
    avatar: url, // profileImg 'https://placeimg.com/140/140/anydss'
  }
  const [imgSelectVisible, setImgSelectVisible] = useState(false);
  const options = {
    title: 'Select Avatar',
    storageOptions: {
      skipBackup: true,
    },
  };
  const [incrementId, setIncrementId] = useState();
  const [trigger, setTrigger] = useState(false);

  // load & set ID of img post (in firestore/Chats)
  useEffect(() => {
      // load id of image post
      firestore()
      .collection('Chats2')
      .doc('img_id')
      .get()
      .then((snapshot) => {
        // set id of img post 
        setIncrementId(snapshot.data()['incrementID'])
        console.log('id updated')
      })
      .catch((err) => { console.log(err, 'incrementID를 불러오는데 실패하였습니다') })
  }, [trigger])

  // download profile img
  useEffect(() => {
    storage()
        .ref('Users/' + auth().currentUser.email) //name in storage in firebase console
        .getDownloadURL()
        .then((url) => {
            console.log('프로필 이미지를 다운로드 하였습니다')
            setUrl(url)
        })
        .catch((e) => console.log('Errors while downloading => ', e));
  }, [])

  useLayoutEffect(() => {
  // useLayoutEffect(() => { // 변경 후 화면을 띄운다 useLayoutEffect
      // Load messages
    const collectionRef = firestore().collection('Chats')
    const query = collectionRef.doc('1') //.orderBy('createdAt', 'desc')
    let a = 0;
    const unsubscribe =  query.onSnapshot(snapshot => {
      try {
        
        for (let [key, value] of Object.entries(snapshot.data())) {
          console.log('zzzzzzzzzzzzzzzzzzz',value)
          // () => ( 
          //   console.log(value)
            // {
            //   _id: key,
            //   createdAt: value.createdAt.toDate(),
            //   text: value.text,
            //   user: value.user,
            //   image: value.image,
            // }
          // )
        }
      } catch (e) {console.log(e);}
    })
    console.log(a)
    return unsubscribe;
        // snapshot.data().map(doc => {
        //   console.log(doc)
          // createdAt: doc.createdAt.toDate(),
          // text: doc.text,
          // user: doc.user,
          // image: doc.image,
        // });
        // setMessages( // setMessages에 firestore에서 가져온 데이터 저장
        //   snapshot.docs.map(doc => ({
        //     _id: doc.data()._id,
        //     createdAt: doc.data().createdAt.toDate(),
        //     text: doc.data().text,
        //     user: doc.data().user,
        //     image: doc.data().image,
        //   })));
          // console.log(snapshot.docs[0].data().text);
  });
  // document를 미리 생성해야 한다
  const addChat = () => {
    const _id = 'chat2' // 메시지 고유 id
    const chat = {
      [_id]: {
        _id: 0,
        createdAt: 0,
        text: 0,
        image: 0,
        user: {
          _id: 0,
          avatar: 0,
          name: 0,
        }
      }
    }
    firestore().collection('Chats')
    .doc('2')
    .update(chat)
    .then(() => {console.log('update 성공')});
  }
  
  const onSend = useCallback((messages = []) => {
    setMessages(previousMessages => GiftedChat.append(previousMessages, messages));
    const { _id, createdAt, text, user, } = messages[0];
    const chatId = _id // 메시지 고유 id
    const chat = {
      [chatId]: {
        // _id: 0,
        createdAt: createdAt,
        text: text,
        image: "",
        user: user
      }
    }
    firestore()
    .collection('Chats')
    .doc('1') // 채팅방 id (== 게시글 id)
    .update(chat)
  })

  // download img url from storage & add img post in firestore/Chats
  const downloadImg = () => {
    setImgSelectVisible(false); // BottomSheet 닫기

    storage()
    .ref(`Chats/${postId}/`+ incrementId)
    .getDownloadURL()
    .then((url) => {
      console.log('storage에서 이미지를 다운로드 하였습니다')
      setUrl(url)
      // firestore Chats에 이미지 게시글 생성
      firestore()
      .collection('Chats2')
      .add({
        post: postId, // 수정
        _id: incrementId, // unique id issue
        createdAt: new Date(),
        text: '',
        user: userInfo,
        image: url,
      })
      .then(() => {console.log('채팅방(firestore)에 이미지를 저장했습니다')})
      .catch((e) => {console.log('채팅방(firestore)에 이미지를 저장하지 못하였습니다', e)})

      // +1 incrementID field in firestore
      const increment = firestore.FieldValue.increment(1);
      firestore().collection('Chats2').doc('img_id').update({ incrementID: increment });
    })
    .catch((e) => console.log('Errors while downloading => ', e));
  }

  const importFromCamera = () => {
      launchCamera(options, (response) => { // Use launchImageLibrary to open image gallery
          if (response.didCancel) {
            console.log('User cancelled image picker');
          } else if (response.error) {
            console.log('ImagePicker Error: ', response.error);
          } else if (response.customButton) {
            console.log('User tapped custom button: ', response.customButton);
          } else {
            const source = response['assets'][0]['uri'];
        
            // You can also display the image using data:
            // const source = { uri: 'data:image/jpeg;base64,' + response.data };
        
            // console.log(source)
            const filename = source.substring(source.lastIndexOf('/') + 1);
            const uploadUri = Platform.OS === 'ios' ? source.replace('file://', '') : source;
            console.log('id is', incrementId)
            const task = storage()
              .ref(`Chats/${postId}/`+ incrementId) // storage에 저장될 경로 toString(Math.random())
              .putFile(uploadUri); // 보낼 이미지의 경로
            // set progress state
            task.on('state_changed', taskSnapshot => {
              console.log(taskSnapshot.state);
            });
            task.then(() => {
              console.log('이미지 업로드 완료');
              // firebase에서 이미지 다운로드
              downloadImg()
            })
            .catch((error) => {
              console.error(error.message);
            });
            
          }
      });
      
  }

  const importFromAlbum = () => {
      launchImageLibrary(options, (response) => {
          if (response["didCancel"] !== true) { // 뒤로가기 시 에러 처리
              const source = response['assets'][0]['uri']; 
              const filename = source.substring(source.lastIndexOf('/') + 1);
              const uploadUri = Platform.OS === 'ios' ? source.replace('file://', '') : source;
  
              const task = storage()
                  .ref(`Chats/${postId}/`+ incrementId) // storage에 저장될 경로
                  .putFile(uploadUri); // 보낼 이미지의 경로
              // set progress state
              task.on('state_changed', taskSnapshot => {
                  console.log(taskSnapshot.state);
              });
              task.then(() => {
                  console.log('Task complete');
                  // firebase에서 이미지 다운로드
                  downloadImg()
              })
              .catch((error) => {
                  console.error(error.message);
              });
          }
      })
    }


// code map 관련 확장 프로그램 알아보기
  return (
    <>
      <GiftedChat
        // showAvatarForEveryMessage={true}
        messages={messages}
        onSend={messages => { onSend(messages); }}
        user={userInfo}
        renderActions={() => {
          return(
              // setImgSelectVisible(true); setTrigger(!trigger);
            <View style={{ height: '100%', justifyContent: 'center', left: 5 }}>
              <TouchableOpacity 
                onPress={() => {addChat();}}>
                <Avatar
                  size={35}
                  rounded
                  icon={{ name: 'plus', type: 'antdesign' }}
                  containerStyle={{ backgroundColor: '#ff7f00',}}
                />
              </TouchableOpacity>
              </View>
          )}
        }
      />
      <ImageModal visible={imgSelectVisible} setVisible={setImgSelectVisible} importFromCamera={importFromCamera} importFromAlbum={importFromAlbum} />
      {/* 사진 첨부 메뉴  */}
      {/* {imgSelectVisible && <ShowBottomSheet importFromCamera={importFromCamera}/>} */}
      {/* <ShowBottomSheet importFromCamera={importFromCamera}/> */}
    </>
  )
}






  // useEffect(() => {
  //   setMessages([      {
  //       _id: 1, // 게시글 id
  //       text: 'Hello developer', // content
  //       createdAt: new Date(),
  //       user: { // user info
  //         _id: 2,
  //         name: 'React Native',
  //         avatar: 'https://placeimg.com/140/140/anydss',
  //       },
  //     },
  //   ]);
  //   console.log('useEffect');
  // }, [])

  // const onSend = useCallback((messages = []) => {
  //   setMessages(previousMessages => GiftedChat.append(previousMessages, messages))
  //   console.log(messages);
  // }, [])