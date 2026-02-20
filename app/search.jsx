import { StyleSheet } from "react-native";
export default function Search() { 
    return (    
        <View style={styles.container}>
            <Text style={styles.title}>Search Screen</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },      
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1A1A1A',
    },
});