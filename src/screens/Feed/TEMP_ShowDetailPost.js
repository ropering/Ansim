import React, { Fragment, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, KeyboardAvoidingView, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Avatar } from 'react-native-elements';
import firestore from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import Moment from 'moment';
import ImageViewer from 'react-native-image-zoom-viewer';
import Icon from 'react-native-vector-icons/AntDesign';

import Colors from '../../constants/Colors';
import * as Firebase from '../../utils/Firebase';
import ErrandStartButton from '../../components/ErrandStartButton';

export default ShowDetailPost = (props) => {
  const navigation = useNavigation()

  const { title, content, writerName, writerGrade, price, writerEmail, id, image, writerImage, views, arrive, destination, date } = props.route.params;

  // 해당 게시물에 다른 사람의 요청이 들어가있는지 체크
  const [processIsRequested, setProcessIsRequested] = useState(false)
  // 본인 게시물인지 체크
  const [confirmMyPost, setConfirmMyPost] = useState(false)
  // 신고 횟수가 많은 작성자인지 체크
  const [isReported, setIsReported] = useState(false)

  const [heartNumber, setHeartNumber] = useState(null);

  const heartsDocId = id + "%" + writerEmail + "%" + Firebase.currentUser.email

  // 좋아요(버튼) 상태 변수
  const [heart, setHeart] = useState(false);

  useEffect(() => {
    // 해당 심부름의 진행 상태와 작성자 확인, 조회수 확인
    const unsubscribe = Firebase.postsRef
      .doc(id + "%" + writerEmail)
      .onSnapshot(doc => {
        if (doc.exists) {
          // 해당 게시물에 다른 사람의 요청이 들어가있는지 체크
          if (doc.data().process.title === 'request') {
            setProcessIsRequested(true)
          } else {
            setProcessIsRequested(false)
          }
          // 본인 게시물인지 체크
          if (doc.data()['writerEmail'] === Firebase.currentUser.email) {
            setConfirmMyPost(true)
          } else {
            setConfirmMyPost(false)
          }

          setHeartNumber(parseInt(doc.data().hearts))
        }
      })
    
    // 신고 횟수가 많은 작성자인지 체크
    Firebase.usersRef
      .doc(writerEmail)
      .get()
      .then(doc => {
        if (doc.exists) {
          Object.entries(doc.data().data).map((entrie, idx) => {
            if (entrie[1] >= 10) {
              setIsReported(true)
            } else {
              setIsReported(false)
            }
          });
        }
      })

    // 조회수 자동 증가
    Firebase.postsRef
      .doc(id + "%" + writerEmail)
      .update({ 'views': views + 1, })
      .then(() => {
        console.log('조회수 변경');
      })
      .catch(err => { console.log(err) })

    // 좋아요 불러오기
    Firebase.heartsRef
      .where("who", "==", Firebase.currentUser.email)
      .where("postid", "==", id + "%" + writerEmail)
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(function (doc) {
          if (doc.data()["state"] === "1") {
            setHeart(true);
          }
        })
      })
      .catch(err => { console.log('에러 발생', err) })

    return unsubscribe
  }, [])


  const opacity = useRef(new Animated.Value(0)).current;

  // 하트 채우기
  const fillHeart = () => {
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.quad,
        useNativeDriver: true,
      }),
      Animated.delay(600),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }

  // 하트 토글
  const toggleHeart = () => {
    if (heart) {
      // 하트 취소 ----------------------------------------------
      setHeart(false)
      Firebase.postsRef
        .doc(id + "%" + writerEmail)
        .update(
          {
            'hearts': firestore.FieldValue.increment(-1),
          })
        .then(() => {
          console.log('하트 취소');
        })
        .catch(err => { console.log(err) })

        Firebase.heartsRef
        .doc(heartsDocId)
        .delete()
      // ----------------------------------------------
    } else {
      // 하트 활성화 ----------------------------------------------
      setHeart(true)
      Firebase.postsRef
        .doc(id + "%" + writerEmail)
        .update({
          'hearts': firestore.FieldValue.increment(1),
        })
        .then(() => {
          console.log('하트 활성화');
        })
        .catch(err => { console.log(err) })

      Firebase.heartsRef
        .doc(heartsDocId)
        .set(
          {
            'postid': id + "%" + writerEmail,
            'state': "1",
            'who': Firebase.currentUser.email,
          })
        .catch(err => { console.log(err) })
      // ----------------------------------------------
    }
    fillHeart();
  }


  // 심부름 요청하기
  const requestErrand = () => {
    Firebase.postsRef
      .doc(id + "%" + writerEmail)
      .update({
        process: {
          title: 'request',         // regist > request > matching > finishRequest > finished
          myErrandOrder: 1,         // 4    > 1 > 3 > 2 > 5(X) (나의 심부름 정렬 기준)
          myPerformErrandOrder: 2,  // 4(X) > 2 > 1 > 3 > 5(X) (내가 하고 있는 심부름 정렬 기준)
        },
        erranderEmail: Firebase.currentUser.email,
        errander: Firebase.currentUser.displayName,
      })
      .then(() => {
        Alert.alert(
          "심부름 수행 요청 완료",
          "요청이 전송되었습니다.\n심부름을 진행해 주세요!",
          [{
            text: "확인",
            onPress: () => props.navigation.navigate('Home'),
            style: "cancel",
          }],
        );
      })
      .catch(err => { console.log(err) })
  }

  // 게시물 상태 업데이트
  const updatePostState = () => {
    if (!processIsRequested) {
      Alert.alert(
        "심부름 수행 요청",
        "심부름 요청을 수행하셨습니다.\n정말로 진행하시겠습니까?",
        [{
          text: "확인",
          onPress: () => requestErrand(),
          style: "default",
        }, {
          text: "취소",
          style: "default",
        }],
      );
    } else {
      Alert.alert(
        "심부름 수행 요청 실패",
        "다른 사용자가 요청중인 심부름입니다.\n다른 심부름을 이용해 주세요.",
        [{
          text: "확인",
          onPress: () => props.navigation.navigate('Home'),
          style: "cancel",
        }],
      );
    }
  }


  // edit mode -----------------------------------------------------------------------

  // 제목 수정 관련 변수 
  const [titleVisible, setTitleVisible] = useState(true);
  const [editedTitle, setEditedTitle] = useState(title);

  // 내용 수정 관리 변수
  const [contentVisible, setContentVisible] = useState(true);
  const [editedContent, setEditedContent] = useState(content);

  // 가격 수정 관리 변수
  const [priceVisible, setPriceVisible] = useState(false);

  const toggleTitle = () => {
    if (titleVisible) {
      setTitleVisible(false)
    }
    else {
      setTitleVisible(true)
    }
  }

  const toggleContent = () => {
    if (contentVisible) {
      setContentVisible(false)
    }
    else {
      setContentVisible(true)
    }
  }

  const updateTitle = () => {
    if (editedTitle.length < 2) {
      Alert.alert(
        "오류",
        "제목은 최소 2글자 이상 입니다.",
        [{
          text: "확인",
          style: "cancel",
        }],
      );
      setTitleVisible(false)
    } else {
      Firebase.postsRef
        .doc(id + "%" + writerEmail)
        .update({
          title: editedTitle
        })
        .catch(err => { console.log(err) })
    }

  }

  const updateContent = () => {
    if (editedContent.length < 2) {
      Alert.alert(
        "오류",
        "내용은 최소 2글자 이상 입니다.",
        [{
          text: "확인",
          style: "cancel",
        }],
      );
      setContentVisible(false)
    } else {
      Firebase.postsRef
        .doc(id + "%" + writerEmail)
        .update({
          content: editedContent
        })
        .catch(err => { console.log(err) })
    }
  }
  // ----------------------------------------------------------------------------


  // 게시물 삭제
  const deletePost = () => {
    Alert.alert(
      "심부름 삭제",
      "정말로 삭제하시겠습니까?",
      [{
        text: "확인",
        onPress: () => {
          Firebase.postsRef
            .doc(id + '%' + writerEmail)
            .delete()
            .then(() => {
              props.navigation.navigate('Home')
            })

          //TODO: HEARTS도 같이 지워줘야함
        },
        style: "default",
      },
      {
        text: "취소",
        style: "default",
      }],
    );
  }

  // 이미지 원본보기 활성화 여부
  const [visible, setVisible] = useState(false);

  // 이미지 원본보기 할 때 필요
  const images = [{
    // Simplest usage.
    url: image,

    // width: number
    // height: number
    // Optional, if you know the image size, you can set the optimization performance

    // You can pass props to <Image />.
    props: {
      // headers: ...
    }
  }, {
    url: '',
    props: {
      // Or you can set source directory.
      // source: require('../background.png')
    }
  }]

  const toggleVisible = () => {
    if (visible) {
      setVisible(false)
    } else {
      setVisible(true)
    }
  }

  return (
    <Fragment>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={{ flex: 1 }} keyboardVerticalOffset={-200} behavior="padding">
          <View style={styles.mainView}>
            <ScrollView>
              <Modal visible={visible} transparent={true}>
                <ImageViewer imageUrls={images} enableSwipeDown={true} onSwipeDown={toggleVisible} />
              </Modal>

              {/* 게시물 이미지 여부 확인 */}
              {image != ""
                ?
                <TouchableOpacity onPress={toggleVisible}>
                  <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
                </TouchableOpacity>
                :
                <>
                  <Text style={{ color: Colors.gray, fontSize: 16, }}>
                    게시물 이미지 없음
                  </Text>
                  <Image style={styles.image} />
                </>
              }

              {/* 신고 여부 확인 */}
              {isReported &&
                <View style={styles.warning}>
                  <Icon style={{ marginLeft: "3%" }} name='infocirlceo' size={15} color={Colors.red} />
                  <Text style={styles.warningText}>신고 이력이 많은 이용자 입니다.</Text>
                </View>
              }

              {/* 내 게시물인지 확인 */}
              {confirmMyPost &&
                <TouchableOpacity onPress={() => { toggleTitle(); updateTitle(); toggleContent(); updateContent(); }}>
                  <View style={styles.editMode}>
                    <Text style={styles.editModeText}>편집</Text>
                  </View>
                </TouchableOpacity>
              }

              {/* 작성자 프로필 */}
              <View style={styles.userRow}>
                <View style={styles.userImage}>
                  <Avatar
                    rounded
                    size="large"
                    source={{ uri: writerImage }}
                  />
                </View>

                <View>
                  <Text style={{ color: Colors.black, fontSize: 16 }}>{writerName}</Text>
                  <Text style={{ color: Colors.gray, fontSize: 16 }}>
                    {writerGrade}
                  </Text>
                </View>
              </View>

              {/* 타이틀 텍스트 */}
              {confirmMyPost
                ?
                  <>
                    {/* 타이틀 보이기 */}
                    {titleVisible
                      ?
                        <Text style={styles.title}>{editedTitle}</Text>
                      :
                        <TextInput
                          style={styles.titleInput}
                          blurOnSubmit={true}
                          value={editedTitle}
                          onChangeText={(text) => setEditedTitle(text)}
                          autoCapitalize="none"
                          maxLength={30}
                          // autoCorrect="false"
                          // returnKeyType="next"
                          // onEndEditing={() => { toggleTitle(); updateTitle(); }} 
                          onSubmitEditing={() => console.log("onSubmitEditing")}
                        />
                    }
                  </>
                :
                  <Text style={styles.title}>{editedTitle}</Text>
              }

              {/* 가격, 조회수, 하트 */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ padding: 10, fontSize: 20, marginLeft: '3%', }}>{price}원</Text>

                <View style={{ flexDirection: 'row', marginTop: '5%' }}>
                  <Icon name='eyeo' size={13} color={Colors.gray} />
                  <Text style={{ paddingLeft: '1%', paddingRight: '2%', fontSize: 12, marginRight: '3%' }}>{views}</Text>

                  <Icon name='heart' size={13} color={Colors.gray} />
                  <Text style={{ paddingLeft: '1%', fontSize: 12, marginRight: '3%' }}>{heartNumber}</Text>
                </View>
              </View>

              {/* 게시글 날짜 */}
              <Text style={{ padding: 10, marginLeft: '3%', fontSize: 13, color: Colors.midGray}}>
                {Moment(date.toDate()).diff(Moment(), 'days') >= -2
                  ? Moment(date.toDate()).fromNow()
                  : Moment(date.toDate()).format('YY/MM/DD')}
              </Text>

              {/* 구분선 */}
              <View style={{ margin: "5%", borderBottomWidth: 1, borderBottomColor: Colors.lightGray2 }}></View>

              {/* 내용 텍스트*/}
              {confirmMyPost
                ?
                  <>
                    {contentVisible
                      ?
                        <Text style={{ marginBottom: '10%', marginTop: '10%', margin: '3%', padding: 10, fontSize: 18, maxWidth: "85%", }}>{editedContent}</Text>
                      :
                        <TextInput
                          style={{ marginBottom: '10%', marginTop: '10%', color: Colors.black, margin: '3%', padding: 10, fontSize: 18, maxWidth: "90%", backgroundColor: '#eee', borderRadius: 5 }}
                          blurOnSubmit={true}
                          value={editedContent}
                          onChangeText={(text) => setEditedContent(text)}
                          autoCapitalize="none"
                          // autoCorrect="false"
                          // returnKeyType="next"
                          onSubmitEditing={() => console.log("onSubmitEditing")}
                          maxLength={1000}
                          multiline={true}
                        />
                    }
                  </>
                :
                  <Text style={{ marginBottom: '10%', marginTop: '10%', margin: '3%', padding: 10, fontSize: 18, maxWidth: "85%", }}>{editedContent}</Text>
              }

              {/* 목적지, 도착지 */}
              {arrive !== "" &&
                <View style={styles.location}>
                  <Text style={styles.locationText}>목적지 : </Text>
                  <Text style={styles.locationText2}>{arrive}</Text>
                </View>
              }
              {destination !== "" &&
                <View style={styles.location}>
                  <Text style={styles.locationText}>도착지 : </Text>
                  <Text style={styles.locationText2}>{destination}</Text>
                </View>
              }

              {/* 삭제 버튼 */}
              {confirmMyPost &&
                <TouchableOpacity onPress={() => { deletePost() }}>
                  <View style={styles.archive}>
                    <Text style={styles.archiveText}>삭제</Text>
                  </View>
                </TouchableOpacity>
              }
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        {/* 아래 부분 메뉴 */}
        <View style={styles.footer}>
          {/* 테스트를 위해 내 심부름도 일단 요청 가능하게 */}
          {/* <TouchableOpacity onPress={() => updatePostState()} disabled={confirmMyPost} > */}
          <View style={styles.heart}>
            <TouchableOpacity
              onPress={toggleHeart}
              style={{
                width: 30,
                height: 30,
              }}
            >
              {/* heart값에 따른 아이콘 변경 */}
              {heart ? <Icon name="heart" size={25} color={Colors.red}></Icon> : <Icon name="hearto" size={25} color={Colors.black}></Icon>}
            </TouchableOpacity>
          </View>

          {/* 심부름 시작 버튼 */}
          <ErrandStartButton onPress={() => updatePostState()} />
        </View>
      </SafeAreaView>
    </Fragment>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  mainView: {
    height: "100%",
    backgroundColor: Colors.white,
  },
  image: {
    width: '100%',
    height: 300,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: "10%",
    marginRight: "10%",
    marginTop: "5%",
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#fffce6"
  },
  warningText: {
    marginLeft: "3%",
    color: "#5e5200"
  },
  editMode: {
    alignItems: 'flex-end',
    marginLeft: "80%",
    marginRight: "5%",
    marginTop: "5%",
    padding: 10,
    borderRadius: 20,
  },
  editModeText: {
    fontFamily: 'Roboto-Bold',
    color: Colors.black,
    fontSize: 16,
  },
  userRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 8,
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 6,
  },
  userImage: {
    marginRight: 12,
  },

  title: {
    marginTop: '3%',
    marginLeft: '3%',
    fontFamily: 'Roboto-Bold',
    color: Colors.black,
    fontSize: 24,
    padding: 10,
  },
  titleInput: {
    fontFamily: 'Roboto-Bold',
    color: Colors.black,
    fontSize: 24,
    padding: 10,
    margin: 10,
    backgroundColor: '#eee',
    borderRadius: 5
  },
  location: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: "10%",
    marginRight: "10%",
    marginTop: "5%",
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#eee"
  },
  locationText: {
    marginLeft: "3%",
    color: Colors.black,
  },
  locationText2: {
    marginLeft: "3%",
    marginRight: "20%",
    color: Colors.black,
  },
  archive: {
    alignItems: 'center',
    marginLeft: "10%",
    marginRight: "10%",
    marginTop: "5%",
    padding: 10,
    borderRadius: 20,
    backgroundColor: Colors.red,
  },
  archiveText: {
    fontFamily: 'Roboto-Bold',
    color: Colors.white,
    fontSize: 16,
  },
  footer: {
    height: "10%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: 'row',
  },
  heart: {
    marginRight: "50%",
    alignItems: "flex-start",
  },
});