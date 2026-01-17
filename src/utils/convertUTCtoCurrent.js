import moment from 'moment';

function convertUtcToLocal(utcTimeString) {
    return moment.utc(utcTimeString).local().format('YYYY-MM-DD HH:mm:ss');
}

export default convertUtcToLocal;