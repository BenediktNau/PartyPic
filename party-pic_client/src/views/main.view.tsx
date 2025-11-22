
import LogAndReg from '../components/Profile/LogAndReg.comp'
import { animateScroll as scroll } from 'react-scroll';
import { useAuth } from '../auth.context';
import { useCreateSession } from '../api/session/session.hooks';


function Main() {

    const scrollToBottom = () => {
        scroll.scrollToBottom();
    };

    const _useCreateSession = useCreateSession();

    const handleClick = async () => {
        if (!auth.isAuthenticated) {
            scrollToBottom();
        } else {
            _useCreateSession.mutate();
        }
    }

    const auth = useAuth();
    console.log("Auth Status im Main View:", auth.isAuthenticated);

    return (
        <div className="p-2 flex flex-col items-center justify-center bg-gray-900 text-white ">
            <div className='flex h-screen  items-center justify-center  mb-10 space-y-8'>
                <div className='flex flex-col max-w-lg rounded-lg bg-gray-800 p-8 space-y-7 shadow-lg justify-center items-center'>
                    <h1 className="text-2xl font-bold">
                        Herzlich Willkommen bei Party-Pic!
                    </h1>
                    <div className='text-xl'>Starte jetzt deine Session!</div>
                    <button onClick={() => { handleClick() }}>Clicke Hier</button>
                </div>

            </div>

            {!auth.isAuthenticated ? <div className='h-screen flex justify-center items-center'><LogAndReg /></div> : <div></div>}



        </div>
    )
}

export default Main